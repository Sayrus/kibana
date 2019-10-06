/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { FilterEditor } from './filter_editor';
import { JoinEditor } from './join_editor';
import { FlyoutFooter } from './flyout_footer';
import { LayerErrors } from './layer_errors';
import { LayerSettings } from './layer_settings';
import { SourceSettings } from './source_settings';
import { StyleSettings } from './style_settings';
import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiAccordion,
  EuiText,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';

import { Storage } from 'ui/storage';
const localStorage = new Storage(window.localStorage);

// This import will eventually become a dependency injected by the fully deangularized NP plugin.
import { npStart } from 'ui/new_platform';

export class LayerPanel extends React.Component {

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextId = nextProps.selectedLayer ? nextProps.selectedLayer.getId() : null;
    if (nextId !== prevState.prevId) {
      return {
        displayName: '',
        immutableSourceProps: [],
        hasLoadedSourcePropsForLayer: false,
        prevId: nextId,
      };
    }
    return null;
  }

  state = {};

  componentDidMount() {
    this._isMounted = true;
    this.loadDisplayName();
    this.loadImmutableSourceProperties();
  }

  componentDidUpdate() {
    this.loadDisplayName();
    this.loadImmutableSourceProperties();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  loadDisplayName = async () => {
    if (!this.props.selectedLayer) {
      return;
    }

    const displayName = await this.props.selectedLayer.getDisplayName();
    if (!this._isMounted || displayName === this.state.displayName) {
      return;
    }

    this.setState({ displayName });
  }

  loadImmutableSourceProperties = async () => {
    if (this.state.hasLoadedSourcePropsForLayer || !this.props.selectedLayer) {
      return;
    }

    const immutableSourceProps = await this.props.selectedLayer.getImmutableSourceProperties();
    if (this._isMounted) {
      this.setState({
        immutableSourceProps,
        hasLoadedSourcePropsForLayer: true,
      });
    }
  }

  _renderFilterSection() {
    if (!this.props.selectedLayer.supportsElasticsearchFilters()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <FilterEditor/>
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderJoinSection() {
    if (!this.props.selectedLayer.isJoinable()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <JoinEditor/>
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderSourceProperties() {
    return this.state.immutableSourceProps.map(({ label, value, link }) => {
      function renderValue() {
        if (link) {
          return (<EuiLink href={link} target="_blank">{value}</EuiLink>);
        }
        return (<span>{value}</span>);
      }
      return (
        <p key={label} className="mapLayerPanel__sourceDetail">
          <strong>{label}</strong>{' '}
          {renderValue()}
        </p>
      );
    });
  }

  render() {
    const { selectedLayer } = this.props;

    if (!selectedLayer) {
      return null;
    }

    return (
      <KibanaContextProvider
        services={{
          appName: 'maps',
          store: localStorage,
          data: npStart.plugins.data,
          ...npStart.core,
        }}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
        >
          <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={
                    i18n.translate('xpack.maps.layerPanel.fitToBoundsAriaLabel', {
                      defaultMessage: 'Fit to bounds'
                    })
                  }
                  iconType={selectedLayer.getLayerTypeIconName()}
                  onClick={this.props.fitToBounds}
                >
                  <FormattedMessage
                    id="xpack.maps.layerPanel.fitToBoundsButtonLabel"
                    defaultMessage="Fit"
                  />

                </EuiButtonIcon>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{this.state.displayName}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <div className="mapLayerPanel__sourceDetails">
              <EuiAccordion
                id="accordion1"
                buttonContent={
                  i18n.translate('xpack.maps.layerPanel.sourceDetailsLabel', {
                    defaultMessage: 'Source details'
                  })
                }
              >
                <EuiText color="subdued" size="s">
                  <EuiSpacer size="xs" />
                  {this._renderSourceProperties()}
                </EuiText>
              </EuiAccordion>
            </div>
          </EuiFlyoutHeader>

          <div className="mapLayerPanel__body">
            <div className="mapLayerPanel__bodyOverflow">

              <LayerErrors/>

              <LayerSettings/>

              <SourceSettings/>

              {this._renderFilterSection()}

              {this._renderJoinSection()}

              <StyleSettings/>

            </div>
          </div>

          <EuiFlyoutFooter className="mapLayerPanel__footer">
            <FlyoutFooter />
          </EuiFlyoutFooter>
        </EuiFlexGroup>
      </KibanaContextProvider>
    );
  }
}
