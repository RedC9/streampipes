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

import type { SpAsset, SpAssetModel } from '@streampipes/platform-services';
import { describe, expect, it } from 'vitest';
import {
    buildAssetHierarchy,
    filterAssetHierarchy,
    sortAssetHierarchy,
    flattenVisibleAssetHierarchy,
} from './asset-hierarchy';

const leaf = (name: string, children: SpAsset[] = []): SpAsset => ({
    assetId: name,
    assetName: name,
    assetDescription: '',
    assets: children,
    assetSite: undefined,
    assetType: undefined,
    assetLinks: [],
    labelIds: [],
    additionalData: {},
});
const root = (name: string, children: SpAsset[] = []): SpAssetModel => ({
    ...leaf(name, children),
    elementId: name,
    appDocType: 'asset-management',
    removable: true,
    rev: '',
});
const siteLabel = (asset: SpAsset) => asset.assetSite?.siteId ?? '';

describe('Asset hierarchy search', () => {
    it('sorts siblings without moving a child away from its parent', () => {
        const nodes = buildAssetHierarchy([
            root('A', [leaf('A1'), leaf('A2')]),
            root('B', [leaf('B1')]),
        ]);
        const sorted = sortAssetHierarchy(nodes, (a, b) =>
            b.assetName.localeCompare(a.assetName),
        );
        expect(sorted.map(node => node.asset.assetName)).toEqual(['B', 'A']);
        expect(sorted[1].children.map(node => node.asset.assetName)).toEqual([
            'A2',
            'A1',
        ]);
        expect(nodes[0].children.map(node => node.asset.assetName)).toEqual([
            'A1',
            'A2',
        ]);
    });

    it('keeps collapsed descendants out of detailed rows and retains depth when expanded', () => {
        const nodes = buildAssetHierarchy([
            root('A', [leaf('A1', [leaf('A1a')])]),
            root('B'),
        ]);
        expect(
            flattenVisibleAssetHierarchy(nodes, new Set()).map(
                row => row.node.asset.assetName,
            ),
        ).toEqual(['A', 'B']);
        const rows = flattenVisibleAssetHierarchy(
            nodes,
            new Set(['A', 'A/A1']),
        );
        expect(rows.map(row => [row.node.asset.assetName, row.depth])).toEqual([
            ['A', 0],
            ['A1', 1],
            ['A1a', 2],
            ['B', 0],
        ]);
        expect(rows[2].node.rootId).toBe('A');
    });
    it('keeps the ancestor chain of a child match and removes unrelated siblings', () => {
        const original = buildAssetHierarchy([
            root('Factory', [leaf('Line', [leaf('Pump')]), leaf('Oven')]),
            root('Office'),
        ]);
        const matches = filterAssetHierarchy(original, ' pump ', siteLabel);
        expect(matches.map(node => node.asset.assetName)).toEqual(['Factory']);
        expect(matches[0].children.map(node => node.asset.assetName)).toEqual([
            'Line',
        ]);
        expect(matches[0].children[0].children[0].rootId).toBe('Factory');
        expect(original[0].children).toHaveLength(2);
    });

    it('keeps the complete subtree when its parent matches', () => {
        const nodes = buildAssetHierarchy([
            root('Factory', [leaf('Pump'), leaf('Oven')]),
        ]);
        expect(
            filterAssetHierarchy(nodes, 'FACTORY', siteLabel)[0].children,
        ).toHaveLength(2);
    });

    it('searches descriptions and site labels', () => {
        const asset = root('Factory');
        asset.assetDescription = 'Assembly equipment';
        asset.assetSite = {
            siteId: 'Berlin',
            area: '',
            hasExactLocation: false,
            location: undefined,
        };
        const nodes = buildAssetHierarchy([asset]);
        expect(filterAssetHierarchy(nodes, 'assembly', siteLabel)).toHaveLength(
            1,
        );
        expect(filterAssetHierarchy(nodes, 'berlin', siteLabel)).toHaveLength(
            1,
        );
    });

    it('handles no matches and clearing the search', () => {
        const nodes = buildAssetHierarchy([root('Factory')]);
        expect(filterAssetHierarchy(nodes, 'missing', siteLabel)).toEqual([]);
        expect(filterAssetHierarchy(nodes, '  ', siteLabel)).toBe(nodes);
        expect(filterAssetHierarchy([], 'pump', siteLabel)).toEqual([]);
    });
});
