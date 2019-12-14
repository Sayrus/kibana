/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer } from './layer';
import _ from 'lodash';
import { SOURCE_DATA_ID_ORIGIN, LAYER_TYPE } from '../../common/constants';

export class TileLayer extends AbstractLayer {
  static type = LAYER_TYPE.TILE;

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
  }

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = TileLayer.type;
    tileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    return tileLayerDescriptor;
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      //data is immmutable
      return;
    }
    const requestToken = Symbol(`layer-source-refresh:${this.getId()} - source`);
    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, dataFilters);
    try {
      const url = await this._source.getUrlTemplate();
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, url, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  _getMbLayerId() {
    return this.makeMbLayerId('raster');
  }

  getMbLayerIds() {
    return [this._getMbLayerId()];
  }

  ownsMbLayerId(mbLayerId) {
    return this._getMbLayerId() === mbLayerId;
  }

  ownsMbSourceId(mbSourceId) {
    return this.getId() === mbSourceId;
  }

  syncLayerWithMB(mbMap) {
    const source = mbMap.getSource(this.getId());
    const mbLayerId = this._getMbLayerId();

    if (!source) {
      const sourceDataRequest = this.getSourceDataRequest();
      if (!sourceDataRequest) {
        //this is possible if the layer was invisible at startup.
        //the actions will not perform any data=syncing as an optimization when a layer is invisible
        //when turning the layer back into visible, it's possible the url has not been resovled yet.
        return;
      }
      const url = sourceDataRequest.getData();
      if (!url) {
        return;
      }

      const sourceId = this.getId();
      mbMap.addSource(sourceId, {
        type: 'raster',
        tiles: [url],
        tileSize: 256,
        scheme: 'xyz',
      });

      mbMap.addLayer({
        id: mbLayerId,
        type: 'raster',
        source: sourceId,
        minzoom: this._descriptor.minZoom,
        maxzoom: this._descriptor.maxZoom,
      });
    }

    this._setTileLayerProperties(mbMap, mbLayerId);
  }

  _setTileLayerProperties(mbMap, mbLayerId) {
    this.syncVisibilityWithMb(mbMap, mbLayerId);
    mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    mbMap.setPaintProperty(mbLayerId, 'raster-opacity', this.getAlpha());
  }

  getLayerTypeIconName() {
    return 'grid';
  }

  isLayerLoading() {
    return false;
  }
}
