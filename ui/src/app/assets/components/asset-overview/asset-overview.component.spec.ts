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

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {
    AssetManagementService,
    AssetSummaryDto,
} from '@streampipes/platform-services';
import {
    CurrentUserService,
    DialogService,
    SpAssetBrowserService,
    SpBreadcrumbService,
} from '@streampipes/shared-ui';
import { BehaviorSubject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IdGeneratorService } from '../../../core-services/id-generator/id-generator.service';
import { SpAssetOverviewComponent } from './asset-overview.component';
import { AssetOverviewViewService } from './asset-overview-view.service';

describe('Asset overview view integration', () => {
    const summary: AssetSummaryDto = {
        elementId: 'asset-1',
        assetName: 'Plant',
        assetDescription: '',
        removable: true,
    };
    let filter: BehaviorSubject<{ filterActive: boolean; selectedAssets?: [] }>;
    let api: {
        getAssetSummary: ReturnType<typeof vi.fn>;
        getAllAssets: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        filter = new BehaviorSubject({ filterActive: false });
        api = {
            getAssetSummary: vi.fn(() =>
                of({ resources: [summary], totalCount: 1 }),
            ),
            getAllAssets: vi.fn(() => of([])),
        };
        TestBed.configureTestingModule({
            imports: [SpAssetOverviewComponent],
            providers: [
                { provide: AssetManagementService, useValue: api },
                {
                    provide: SpAssetBrowserService,
                    useValue: {
                        assetData$: new BehaviorSubject({ sites: [] }),
                        currentAssetFilter$: filter,
                    },
                },
                {
                    provide: SpBreadcrumbService,
                    useValue: {
                        getRootLink: vi.fn(),
                        updateBreadcrumb: vi.fn(),
                    },
                },
                {
                    provide: CurrentUserService,
                    useValue: { hasRole: () => false },
                },
                { provide: DialogService, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: Router, useValue: { navigate: vi.fn() } },
                { provide: IdGeneratorService, useValue: {} },
                {
                    provide: TranslateService,
                    useValue: { instant: (text: string) => text },
                },
            ],
        });
        TestBed.overrideComponent(SpAssetOverviewComponent, {
            set: { template: '', imports: [] },
        });
    });

    it('keeps the default table on the summary endpoint', () => {
        const fixture = TestBed.createComponent(SpAssetOverviewComponent);
        fixture.detectChanges();
        expect(api.getAssetSummary).toHaveBeenCalledTimes(1);
        expect(api.getAllAssets).not.toHaveBeenCalled();
    });

    it('loads hierarchy data once and reuses it when switching richer views', () => {
        const fixture = TestBed.createComponent(SpAssetOverviewComponent);
        const state = TestBed.inject(AssetOverviewViewService);
        fixture.detectChanges();
        state.view.set('cards');
        fixture.detectChanges();
        expect(api.getAllAssets).toHaveBeenCalledTimes(1);
        state.view.set('detailed');
        fixture.detectChanges();
        expect(api.getAllAssets).toHaveBeenCalledTimes(1);
        fixture.componentInstance.loadAssets();
        expect(api.getAllAssets).toHaveBeenCalledTimes(2);
    });

    it('shows zero rows for an active filter with no matches, then restores the full table', () => {
        const fixture = TestBed.createComponent(SpAssetOverviewComponent);
        fixture.detectChanges();
        expect(fixture.componentInstance.dataSource.data).toHaveLength(1);
        filter.next({ filterActive: true, selectedAssets: [] });
        expect(fixture.componentInstance.dataSource.data).toEqual([]);
        filter.next({ filterActive: false });
        expect(fixture.componentInstance.dataSource.data).toHaveLength(1);
    });
});
