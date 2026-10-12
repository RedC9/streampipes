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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'sp-asset-image-placeholder',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon],
    host: { 'aria-hidden': 'true' },
    template: '<mat-icon aria-hidden="true">image</mat-icon>',
    styles: `
        :host {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 4rem;
            height: 3rem;
            box-sizing: border-box;
            border: 1px dashed var(--mat-sys-outline-variant);
            border-radius: var(--radius-sm);
            background: var(--mat-sys-surface-container-low);
            color: var(--mat-sys-on-surface-variant);
        }
        mat-icon {
            width: 1.75rem;
            height: 1.75rem;
            font-size: 1.75rem;
        }
    `,
})
export class AssetImagePlaceholderComponent {}
