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
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTreeModule } from '@angular/material/tree';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import {
    AssetConstants,
    AssetManagementService,
    AssetSiteDesc,
    GenericStorageService,
    SpAsset,
    SpAssetModel,
} from '@streampipes/platform-services';
import {
    SplitSectionComponent,
    SpAlertBannerComponent,
    SpAssetBrowserService,
    SpBasicViewComponent,
    SpLabelComponent,
    SpPageHeaderComponent,
    SpSecondaryToolbarComponent,
    SpSpinnerComponent,
} from '@streampipes/shared-ui';
import { AssetPreviewComponent } from './asset-preview.component';
import { AssetImagePlaceholderComponent } from './asset-image-placeholder.component';
import { ViewAssetLinksComponent } from '../../assets/components/asset-details/view-asset/view-asset-links/view-asset-links.component';
import {
    AssetHierarchyNode,
    buildAssetHierarchy,
    filterAssetHierarchy,
} from './asset-hierarchy';

interface SiteGroup {
    id: string;
    label: string;
    nodes: AssetHierarchyNode[];
}

@Component({
    selector: 'sp-asset-overview-exploration',
    templateUrl: './asset-overview-exploration.component.html',
    styleUrls: ['./asset-overview-exploration.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        AssetImagePlaceholderComponent,
        FormsModule,
        NgTemplateOutlet,
        RouterLink,
        FlexLayoutModule,
        TranslatePipe,
        MatButtonModule,
        MatCardModule,
        MatListModule,
        MatPaginatorModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTreeModule,
        MatTabsModule,
        MatTooltipModule,
        SpAlertBannerComponent,
        SpBasicViewComponent,
        SpLabelComponent,
        SpPageHeaderComponent,
        SpSecondaryToolbarComponent,
        SpSpinnerComponent,
        SplitSectionComponent,
        ViewAssetLinksComponent,
    ],
})
export class AssetOverviewExplorationComponent implements OnInit {
    private readonly assetService = inject(AssetManagementService);
    private readonly storageService = inject(GenericStorageService);
    private readonly browserService = inject(SpAssetBrowserService);
    private readonly dialog = inject(MatDialog);
    private readonly translateService = inject(TranslateService);
    private readonly destroyRef = inject(DestroyRef);

    assets: SpAssetModel[] = [];
    filteredAssets: SpAssetModel[] = [];
    pageAssets: SpAssetModel[] = [];
    pageTreeNodes: AssetHierarchyNode[] = [];
    readonly pageSize = 10;
    pageIndex = 0;
    treeNodes: AssetHierarchyNode[] = [];
    private allTreeNodes: AssetHierarchyNode[] = [];
    selectedBrowseAsset?: SpAssetModel;
    readonly expandedSiteHierarchy = new Set<string>();
    groups: SiteGroup[] = [];
    sites = new Map<string, AssetSiteDesc>();
    query = '';
    loading = false;
    failed = false;
    browserFilterActive = false;
    private selectedIds?: Set<string>;

    readonly childrenAccessor = (node: AssetHierarchyNode) => node.children;
    get childrenForBrowse(): AssetHierarchyNode[] {
        return (
            this.treeNodes.find(
                node => node.rootId === this.selectedBrowseAsset?.elementId,
            )?.children ?? []
        );
    }
    readonly expansionKey = (node: AssetHierarchyNode) => node.id;
    readonly hasChildren = (_index: number, node: AssetHierarchyNode) =>
        node.children.length > 0;

    ngOnInit(): void {
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
            assets: this.assetService.getAllAssets(),
            sites: this.storageService.getAllDocuments(
                AssetConstants.ASSET_SITES_APP_DOC_NAME,
            ),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ assets, sites }) => {
                    this.assets = [...assets].sort((a, b) =>
                        a.assetName.localeCompare(b.assetName),
                    );
                    this.allTreeNodes = buildAssetHierarchy(this.assets);
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
        const selected = this.assets.filter(
            asset => !this.selectedIds || this.selectedIds.has(asset.elementId),
        );
        this.treeNodes = filterAssetHierarchy(
            this.allTreeNodes.filter(
                node => !this.selectedIds || this.selectedIds.has(node.rootId),
            ),
            this.query,
            asset => this.siteLabel(asset),
        );
        const rootIds = new Set(this.treeNodes.map(node => node.rootId));
        this.filteredAssets = selected.filter(asset =>
            rootIds.has(asset.elementId),
        );
        this.pageIndex = 0;
        this.updatePage();
    }

    changePage(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.updatePage();
    }

    private updatePage(): void {
        this.pageIndex = Math.min(
            this.pageIndex,
            Math.max(
                0,
                Math.ceil(this.filteredAssets.length / this.pageSize) - 1,
            ),
        );
        const offset = this.pageIndex * this.pageSize;
        this.pageAssets = this.filteredAssets.slice(
            offset,
            offset + this.pageSize,
        );
        const pageIds = new Set(this.pageAssets.map(asset => asset.elementId));
        this.pageTreeNodes = this.treeNodes.filter(node =>
            pageIds.has(node.rootId),
        );
        this.selectedBrowseAsset =
            this.pageAssets.find(
                asset =>
                    asset.elementId === this.selectedBrowseAsset?.elementId,
            ) ?? this.pageAssets[0];
        const nodesByRoot = new Map(
            this.treeNodes.map(node => [node.rootId, node]),
        );
        const groups = new Map<string, SiteGroup>();
        for (const asset of this.pageAssets) {
            const id = asset.assetSite?.siteId || '';
            if (!groups.has(id)) {
                groups.set(id, {
                    id,
                    label: this.siteLabel(asset),
                    nodes: [],
                });
            }
            groups.get(id).nodes.push(nodesByRoot.get(asset.elementId));
        }
        this.groups = [...groups.values()].sort((a, b) =>
            a.id === '' ? 1 : b.id === '' ? -1 : a.label.localeCompare(b.label),
        );
    }

    clearSearch(input: HTMLInputElement): void {
        this.query = '';
        this.applyFilters();
        input.focus();
    }

    setSiteHierarchyExpanded(nodeId: string, event: Event): void {
        const open = (event.target as HTMLDetailsElement).open;
        if (open) {
            this.expandedSiteHierarchy.add(nodeId);
        } else {
            this.expandedSiteHierarchy.delete(nodeId);
        }
    }

    siteLabel(asset: SpAsset): string {
        const siteId = asset.assetSite?.siteId;
        return siteId ? this.sites.get(siteId)?.label || siteId : '';
    }

    openPreview(asset: SpAsset, rootId: string): void {
        this.dialog.open(AssetPreviewComponent, {
            ariaLabel: this.translateService.instant('Asset preview'),
            width: '36rem',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: '90vh',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            data: { asset, rootId, siteLabel: this.siteLabel(asset) },
        });
    }
}
