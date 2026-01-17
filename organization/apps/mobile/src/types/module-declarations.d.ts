/**
 * Module declarations for third-party packages without types
 * and asset imports
 */

// React Native Community NetInfo
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: any;
  }

  export type NetInfoSubscription = () => void;

  export interface NetInfo {
    addEventListener(
      listener: (state: NetInfoState) => void
    ): NetInfoSubscription;
    fetch(): Promise<NetInfoState>;
    refresh(): Promise<NetInfoState>;
  }

  const NetInfo: NetInfo;
  export default NetInfo;
}

// React Native Maps
declare module 'react-native-maps' {
  import { Component } from 'react';
  import { ViewProps, StyleProp, ViewStyle } from 'react-native';

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface MapViewProps extends ViewProps {
    style?: StyleProp<ViewStyle>;
    initialRegion?: Region;
    region?: Region;
    onRegionChange?: (region: Region) => void;
    onRegionChangeComplete?: (region: Region) => void;
    showsUserLocation?: boolean;
    showsMyLocationButton?: boolean;
    followsUserLocation?: boolean;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    rotateEnabled?: boolean;
    pitchEnabled?: boolean;
    mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'none';
  }

  export interface MarkerProps extends ViewProps {
    coordinate: LatLng;
    title?: string;
    description?: string;
    pinColor?: string;
    onPress?: () => void;
    onCalloutPress?: () => void;
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: (e: any) => void;
  }

  export interface PolylineProps {
    coordinates: LatLng[];
    strokeColor?: string;
    strokeWidth?: number;
    strokeColors?: string[];
    lineCap?: 'butt' | 'round' | 'square';
    lineJoin?: 'miter' | 'round' | 'bevel';
    miterLimit?: number;
    geodesic?: boolean;
    lineDashPattern?: number[];
    lineDashPhase?: number;
    tappable?: boolean;
    onPress?: () => void;
  }

  export class Marker extends Component<MarkerProps> {}
  export class Polyline extends Component<PolylineProps> {}
  export default class MapView extends Component<MapViewProps> {}
}

// Asset imports - PNG images
declare module '*.png' {
  import { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

// Asset imports - JPG images
declare module '*.jpg' {
  import { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

// Asset imports - JPEG images
declare module '*.jpeg' {
  import { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

// Asset imports - GIF images
declare module '*.gif' {
  import { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

// Asset imports - SVG images
declare module '*.svg' {
  import { SvgProps } from 'react-native-svg';
  import { FC } from 'react';
  const content: FC<SvgProps>;
  export default content;
}
