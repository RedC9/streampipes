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

export interface AssetHierarchyNode {
    id: string;
    rootId: string;
    asset: SpAsset;
    children: AssetHierarchyNode[];
}

export function buildAssetHierarchy(
    assets: SpAssetModel[],
): AssetHierarchyNode[] {
    const makeNode = (
        asset: SpAsset,
        rootId: string,
        id: string,
    ): AssetHierarchyNode => ({
        id,
        rootId,
        asset,
        children: [...(asset.assets ?? [])]
            .sort((a, b) => a.assetName.localeCompare(b.assetName))
            .map((child, index) =>
                makeNode(child, rootId, id + '/' + (child.assetId || index)),
            ),
    });
    return assets.map(asset =>
        makeNode(asset, asset.elementId, asset.elementId),
    );
}

/** Preserve ancestors of matches and the complete subtree when its parent matches. */
export function filterAssetHierarchy(
    nodes: AssetHierarchyNode[],
    search: string,
    siteLabel: (asset: SpAsset) => string,
): AssetHierarchyNode[] {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
        return nodes;
    }
    return nodes.flatMap(node => {
        if (
            [
                node.asset.assetName,
                node.asset.assetDescription,
                siteLabel(node.asset),
            ].some(value => value?.toLocaleLowerCase().includes(query))
        ) {
            return [node];
        }
        const children = filterAssetHierarchy(node.children, query, siteLabel);
        return children.length ? [{ ...node, children }] : [];
    });
}
