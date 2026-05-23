// mobile/src/screens/DriverNavigationMode.js

import React, { memo } from "react";

import FlowSyncDriverNavigationMap from "../maps/FlowSyncDriverNavigationMap";

function DriverNavigationMode(props) {
  return <FlowSyncDriverNavigationMap {...props} />;
}

export default memo(DriverNavigationMode);
