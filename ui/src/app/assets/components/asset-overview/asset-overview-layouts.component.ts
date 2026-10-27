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
    Input,
    OnChanges,
    SimpleChanges,
    TemplateRef,
    inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    AssetSiteDesc,
    AssetSummaryDto,
    SpAsset,
    SpAssetModel,
} from '@streampipes/platform-services';
import {
    SpAlertBannerComponent,
    SpLabelComponent,
    SpSecondaryToolbarComponent,
    SpTableActionsDirective,
    SpTableComponent,
} from '@streampipes/shared-ui';
import { AssetImagePlaceholderComponent } from './asset-image-placeholder.component';
import { AssetPreviewComponent } from './asset-preview.component';
import {
    AssetHierarchyNode,
    AssetHierarchyRow,
    buildAssetHierarchy,
    filterAssetHierarchy,
    flattenVisibleAssetHierarchy,
    sortAssetHierarchy,
} from './asset-hierarchy';
import { AssetOverviewView } from './asset-overview-view.service';

interface DetailedAssetRow extends AssetSummaryDto, AssetHierarchyRow {}

@Component({
    selector: 'sp-asset-overview-layouts',
    templateUrl: './asset-overview-layouts.component.html',
    styleUrls: ['./asset-overview-layouts.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        NgTemplateOutlet,
        FormsModule,
        RouterLink,
        FlexLayoutModule,
        TranslatePipe,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatPaginatorModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        SpAlertBannerComponent,
        SpLabelComponent,
        SpSecondaryToolbarComponent,
        SpTableActionsDirective,
        SpTableComponent,
        AssetImagePlaceholderComponent,
    ],
})
export class AssetOverviewLayoutsComponent implements OnChanges {
    @Input() assets: SpAssetModel[] = [];
    @Input() visibleRootIds?: Set<string>;
    @Input() sitesById: Record<string, AssetSiteDesc> = {};
    @Input() viewMode: AssetOverviewView = 'cards';
    @Input() hasWritePrivilege = false;
    @Input() rootActions: TemplateRef<{ $implicit: AssetSummaryDto }>;

    private readonly dialog = inject(MatDialog);
    private readonly router = inject(Router);
    private readonly translateService = inject(TranslateService);
    private allNodes: AssetHierarchyNode[] = [];
    private filteredNodes: AssetHierarchyNode[] = [];
    readonly rootSummaries = new Map<string, AssetSummaryDto>();
    readonly expandedIds = new Set<string>();
    readonly columns = ['assetName', 'location', 'actions'];
    readonly detailedData = new MatTableDataSource<DetailedAssetRow>();
    readonly pageSize = 10;
    pageIndex = 0;
    pageNodes: AssetHierarchyNode[] = [];
    resultCount = 0;
    query = '';
    sort: Sort = { active: 'assetName', direction: 'asc' };

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['assets']) {
            this.allNodes = buildAssetHierarchy(this.assets);
            this.rootSummaries.clear();
            for (const asset of this.assets) {
                this.rootSummaries.set(asset.elementId, {
                    elementId: asset.elementId,
                    assetName: asset.assetName,
                    assetDescription: asset.assetDescription,
                    siteId: asset.assetSite?.siteId,
                    removable: asset.removable,
                });
            }
        }
        this.applyFilters(
            !changes['viewMode'] ||
                !!changes['assets'] ||
                !!changes['visibleRootIds'],
        );
    }

    applyFilters(resetPage = true): void {
        const selected = this.allNodes.filter(
            node =>
                !this.visibleRootIds || this.visibleRootIds.has(node.rootId),
        );
        this.filteredNodes = sortAssetHierarchy(
            filterAssetHierarchy(selected, this.query, asset =>
                this.siteLabel(asset),
            ),
            (a, b) => {
                if (!this.sort.direction) {
                    return 0;
                }
                const first =
                    this.sort.active === 'location'
                        ? this.siteLabel(a)
                        : a.assetName;
                const second =
                    this.sort.active === 'location'
                        ? this.siteLabel(b)
                        : b.assetName;
                return (
                    (first || '').localeCompare(second || '') *
                    (this.sort.direction === 'desc' ? -1 : 1)
                );
            },
        );
        if (this.query.trim()) {
            const expandMatches = (nodes: AssetHierarchyNode[]) => {
                for (const node of nodes) {
                    if (node.children.length) {
                        this.expandedIds.add(node.id);
                        expandMatches(node.children);
                    }
                }
            };
            expandMatches(this.filteredNodes);
        }
        this.resultCount = this.filteredNodes.length;
        if (resetPage) {
            this.pageIndex = 0;
        }
        this.updatePage();
    }

    changePage(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.updatePage();
    }

    private updatePage(): void {
        this.pageIndex = Math.min(
            this.pageIndex,
            Math.max(0, Math.ceil(this.resultCount / this.pageSize) - 1),
        );
        this.pageNodes = this.filteredNodes.slice(
            this.pageIndex * this.pageSize,
            (this.pageIndex + 1) * this.pageSize,
        );
        this.updateRows();
    }

    private updateRows(): void {
        this.detailedData.data = flattenVisibleAssetHierarchy(
            this.pageNodes,
            this.expandedIds,
        ).map(row => ({
            ...this.rootSummaries.get(row.node.rootId),
            ...row,
            assetName: row.node.asset.assetName,
            assetDescription: row.node.asset.assetDescription,
            siteId:
                row.node.asset.assetSite?.siteId ||
                this.rootSummaries.get(row.node.rootId)?.siteId,
        }));
    }

    toggle(node: AssetHierarchyNode): void {
        if (this.expandedIds.has(node.id)) {
            this.expandedIds.delete(node.id);
        } else {
            this.expandedIds.add(node.id);
        }
        this.updateRows();
    }

    changeSort(sort: Sort): void {
        this.sort = sort;
        this.applyFilters();
    }

    clearSearch(input: HTMLInputElement): void {
        this.query = '';
        this.applyFilters();
        input.focus();
    }

    siteLabel(asset: SpAsset): string {
        return this.siteIdLabel(asset.assetSite?.siteId);
    }

    siteIdLabel(siteId?: string): string {
        return siteId ? this.sitesById[siteId]?.label || siteId : '';
    }

    openDetails(row: DetailedAssetRow): void {
        this.router.navigate(['/assets/details', row.node.rootId, 'view']);
    }

    openPreview(node: AssetHierarchyNode): void {
        this.dialog.open(AssetPreviewComponent, {
            ariaLabel: this.translateService.instant('Asset preview'),
            width: '36rem',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: '90vh',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            data: {
                asset: node.asset,
                rootId: node.rootId,
                siteLabel:
                    this.siteLabel(node.asset) ||
                    this.siteIdLabel(
                        this.rootSummaries.get(node.rootId)?.siteId,
                    ),
            },
        });
    }
}
