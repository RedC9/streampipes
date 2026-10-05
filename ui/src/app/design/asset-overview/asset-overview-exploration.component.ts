/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    ViewChild,
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import {
    AssetConstants,
    AssetManagementService,
    AssetSiteDesc,
    AssetSummaryDto,
    GenericStorageService,
    SpAssetModel,
} from '@streampipes/platform-services';
import {
    FormFieldComponent,
    SpAlertBannerComponent,
    SpAssetBrowserService,
    SpBasicViewComponent,
    SpPageHeaderComponent,
    SpSecondaryToolbarComponent,
    SpSpinnerComponent,
    SpTableComponent,
} from '@streampipes/shared-ui';

interface SiteGroup {
    id: string;
    label: string;
    assets: AssetSummaryDto[];
}

@Component({
    selector: 'sp-asset-overview-exploration',
    templateUrl: './asset-overview-exploration.component.html',
    styleUrls: ['./asset-overview-exploration.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FormsModule,
        NgTemplateOutlet,
        FormFieldComponent,
        RouterLink,
        FlexLayoutModule,
        TranslatePipe,
        MatButtonModule,
        MatCardModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSortModule,
        MatTableModule,
        MatTabsModule,
        MatTooltipModule,
        SpAlertBannerComponent,
        SpBasicViewComponent,
        SpPageHeaderComponent,
        SpSecondaryToolbarComponent,
        SpSpinnerComponent,
        SpTableComponent,
    ],
})
export class AssetOverviewExplorationComponent implements OnInit {
    private readonly assetService = inject(AssetManagementService);
    private readonly storageService = inject(GenericStorageService);
    private readonly browserService = inject(SpAssetBrowserService);
    private readonly destroyRef = inject(DestroyRef);

    assets: AssetSummaryDto[] = [];
    filteredAssets: AssetSummaryDto[] = [];
    groups: SiteGroup[] = [];
    sites = new Map<string, AssetSiteDesc>();
    query = '';
    loading = false;
    failed = false;
    browserFilterActive = false;
    private selectedIds?: Set<string>;
    readonly columns = ['assetName', 'assetDescription', 'site'];
    readonly dataSource = new MatTableDataSource<AssetSummaryDto>();

    @ViewChild(MatSort)
    set sort(sort: MatSort) {
        this.dataSource.sort = sort;
    }

    ngOnInit(): void {
        this.dataSource.sortingDataAccessor = (asset, column) =>
            (column === 'site'
                ? this.siteLabel(asset)
                : column === 'assetName'
                  ? asset.assetName
                  : asset.assetDescription
            )?.toLocaleLowerCase() ?? '';
        this.browserService.currentAssetFilter$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(filter => {
                this.browserFilterActive = !!filter?.filterActive;
                this.selectedIds = this.browserFilterActive
                    ? new Set(
                          (filter.selectedAssets ?? []).map(
                              asset => (asset as SpAssetModel).elementId,
                          ),
                      )
                    : undefined;
                this.applyFilters();
            });
        this.loadAssets();
    }

    loadAssets(): void {
        if (this.loading) {
            return;
        }
        this.loading = true;
        this.failed = false;
        forkJoin({
            summary: this.assetService.getAssetSummary(),
            sites: this.storageService.getAllDocuments(
                AssetConstants.ASSET_SITES_APP_DOC_NAME,
            ),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ summary, sites }) => {
                    this.assets = [...summary.resources].sort((a, b) =>
                        a.assetName.localeCompare(b.assetName),
                    );
                    this.sites = new Map(
                        (sites as AssetSiteDesc[]).map(site => [
                            site._id,
                            site,
                        ]),
                    );
                    this.applyFilters();
                    this.loading = false;
                },
                error: () => {
                    this.failed = true;
                    this.loading = false;
                },
            });
    }

    applyFilters(): void {
        const query = this.query.trim().toLocaleLowerCase();
        this.filteredAssets = this.assets.filter(
            asset =>
                (!this.selectedIds || this.selectedIds.has(asset.elementId)) &&
                [
                    asset.assetName,
                    asset.assetDescription,
                    this.siteLabel(asset),
                ].some(value => value?.toLocaleLowerCase().includes(query)),
        );
        this.dataSource.data = this.filteredAssets;
        this.dataSource.paginator?.firstPage();
        const groups = new Map<string, SiteGroup>();
        for (const asset of this.filteredAssets) {
            const id = asset.siteId || '';
            if (!groups.has(id)) {
                groups.set(id, {
                    id,
                    label: this.siteLabel(asset),
                    assets: [],
                });
            }
            groups.get(id).assets.push(asset);
        }
        this.groups = [...groups.values()].sort((a, b) =>
            a.label.localeCompare(b.label),
        );
    }

    siteLabel(asset: AssetSummaryDto): string {
        return asset.siteId
            ? this.sites.get(asset.siteId)?.label || asset.siteId
            : '';
    }
}
