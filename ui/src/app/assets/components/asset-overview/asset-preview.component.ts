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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { SpAsset } from '@streampipes/platform-services';
import {
    FeatureCardHeaderComponent,
    SplitSectionComponent,
    SpLabelComponent,
} from '@streampipes/shared-ui';
import { ViewAssetLinksComponent } from '../asset-details/view-asset/view-asset-links/view-asset-links.component';
import { AssetImagePlaceholderComponent } from './asset-image-placeholder.component';

@Component({
    selector: 'sp-asset-preview',
    templateUrl: './asset-preview.component.html',
    styleUrls: ['./asset-preview.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        AssetImagePlaceholderComponent,
        FlexLayoutModule,
        TranslatePipe,
        MatButtonModule,
        RouterLink,
        FeatureCardHeaderComponent,
        SplitSectionComponent,
        SpLabelComponent,
        ViewAssetLinksComponent,
    ],
})
export class AssetPreviewComponent {
    private readonly data = inject<{
        asset: SpAsset;
        rootId: string;
        siteLabel: string;
    }>(MAT_DIALOG_DATA);
    readonly asset = this.data.asset;
    readonly rootId = this.data.rootId;
    readonly siteLabel = this.data.siteLabel;
    private readonly dialogRef = inject(MatDialogRef<AssetPreviewComponent>);

    close(): void {
        this.dialogRef.close();
    }
}
