<!--
 ~ Licensed to the Apache Software Foundation (ASF) under one or more
 ~ contributor license agreements.  See the NOTICE file distributed with
 ~ this work for additional information regarding copyright ownership.
 ~ The ASF licenses this file to You under the Apache License, Version 2.0
 ~ (the "License"); you may not use this file except in compliance with
 ~ the License.  You may obtain a copy of the License at
 ~
 ~    http://www.apache.org/licenses/LICENSE-2.0
 ~
 ~ Unless required by applicable law or agreed to in writing, software
 ~ distributed under the License is distributed on an "AS IS" BASIS,
 ~ WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 ~ See the License for the specific language governing permissions and
 ~ limitations under the License.
 ~
-->

# Asset overview exploration

Click **Explore layouts** in the normal Assets overview, or open
http://localhost:8082/#/assets/design-overview. Sign in with asset read access.
The existing app configuration uses `withHashLocation()`, so direct browser
URLs need `#/`; Angular `routerLink` handles this automatically.
Use the three tabs to compare the same real assets; search and the global
navigation asset filter persist when switching concepts. The **Assets** button
returns to the production overview.

| Concept   | Best for                                                                                                                            | Trade-off                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Cards     | Browsing a modest asset collection with prominent names, site labels and full descriptions. Responsive three/two/one-column layout. | More scrolling and less direct comparison for large inventories.                                                                            |
| Inventory | Comparing names, descriptions and sites in aligned columns. Uses the shared sortable, paginated `sp-table`.                         | Text-heavy and horizontally scrollable on narrow screens; similar to the existing overview, with descriptions promoted to their own column. |
| By site   | Scanning assets by physical location, with collapsible site groups and counts of matching assets.                                   | Site grouping is only as useful as site assignments; does not represent the nested equipment hierarchy.                                     |

## Data and scope

- Fetches `AssetManagementService.getAssetSummary()` and actual site documents
  through `GenericStorageService` with `AssetConstants.ASSET_SITES_APP_DOC_NAME`.
  All three concepts share one fetched snapshot; refresh reloads both sources.
- Subscribes to `SpAssetBrowserService.currentAssetFilter$`. An active filter with
  zero selected assets correctly yields zero results. Search matches name,
  description and site label. Counts describe matching assets, not equipment health.
- Unassigned sites form their own group; unresolved site references display the
  actual site ID. No invented assets, telemetry, health badges or placeholder images.
- Asset-name links open the existing read-only details route. There are no write
  operations in this prototype. Cards and grouped lists intentionally render all
  matches; only the inventory is paginated.
- Implementation is isolated in this folder. The only integration is an additive,
  lazy route under the existing asset area with an asset-read guard, plus translation
  entries in the deployment catalogs. The production overview now includes the
  requested **Explore layouts** shortcut; its asset table and actions are unchanged.
  This is an exploration route, not a production feature toggle.

## Design and comparison

Reviewed `PRODUCT.md`, `DESIGN.md`, `CONTRIBUTING.md`, `ui/AGENTS.md`,
`ui/STYLEGUIDE.md`, the current overview, home asset table, asset routes,
navigation and shared table/browser components before implementation.

Uses the shared page header, basic view, secondary toolbar, form field, spinner,
alert banner and table, plus Material tabs, cards and expansion panels.
Surfaces, text, spacing, borders and focus use theme tokens. Tabs are keyboard
operable, asset links are native links, loading/results are announced, and errors
include retry. Empty data and empty search results have distinct guidance.
Tab animation is disabled.

For review with your existing assets:

1. Compare all three tabs with a long asset name and description.
2. Search by name and by site; switch tabs and confirm the result count agrees.
3. Apply a navigation filter, including one that matches no assets.
4. Collapse a site group, open an asset and return using browser Back.
5. Try keyboard-only navigation, narrow width, light/dark themes and 200% zoom.
6. Check loading, empty and failed-request states; retry after restoring the backend.

These are UX prototypes, not a production scalability or accessibility audit.
