import { API } from 'homebridge';

import { AirCondionerAccessory } from './platformAccessory'; 

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerAccessory('AirCondionerAccessory', AirCondionerAccessory);
}
