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
package org.apache.streampipes.manager.setup.tasks;

import org.apache.streampipes.storage.couchdb.utils.Utils;

import org.lightcouch.DesignDocument;

import java.util.Map;

import static org.apache.streampipes.manager.setup.design.DesignDocumentUtils.prepareDocument;

public class AddAssetFileUsageViewTask implements InstallationTask {

  public static final String DESIGN_DOCUMENT = "_design/asset-file-usage";
  public static final String VIEW_NAME = "by-file";
  public static final String MAP_FUNCTION = """
      function(doc) {
        if (doc.appDocType !== 'asset-management') { return; }
        function indexAsset(asset) {
          if (!asset) { return; }
          (asset.assetLinks || []).forEach(function(link) {
            if (link && link.linkType === 'file' && link.resourceId) {
              emit(link.resourceId, null);
            }
          });
          (asset.assets || []).forEach(indexAsset);
        }
        indexAsset(doc);
      }
      """;

  @Override
  public void execute() {
    DesignDocument document = prepareDocument(DESIGN_DOCUMENT);
    DesignDocument.MapReduce byFile = new DesignDocument.MapReduce();
    byFile.setMap(MAP_FUNCTION);
    document.setViews(Map.of(VIEW_NAME, byFile));
    Utils.getCouchDbClient("genericstorage", true).design().synchronizeWithDb(document);
  }
}
