import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';

// AirConditionerAPI
// AirConditioner

import { AirConditionerAPI, AirConditioner, State, Mode, Fixation, Fanspeed } from './AirConditionerAPI';

export class AirCondionerAccessory implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly api: API;
  private readonly name: string;
  private airConditionerAPI: AirConditionerAPI;

  private readonly service: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.api = api;
    const ip: string = config['ip'] as string;
    const mac: string = config['mac'] as string;
    // console.log('ip', ip);
    // console.log('mac', mac);

    // this.Service = this.api.hap.Service;
    // this.Characteristic = this.api.hap.Characteristic;


    this.airConditionerAPI = new AirConditionerAPI(ip, mac);

    this.service = new this.api.hap.Service.HeaterCooler;
    this.service.getCharacteristic(api.hap.Characteristic.Active)
      .on('get', this.handleActiveGet.bind(this))
      .on('set', this.handleActiveSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.CurrentHeaterCoolerState)
      .on('get', this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.TargetHeaterCoolerState)
      .on('get', this.handleTargetHeaterCoolerStateGet.bind(this))
      .on('set', this.handleTargetHeaterCoolerStateSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.CurrentTemperature)
      .on('get', this.handleCurrentTemperatureGet.bind(this));
      
    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature)
      .on('get', this.handleThresholdTemperatureGet.bind(this))
      .on('set', this.handleThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature)
      .on('get', this.handleThresholdTemperatureGet.bind(this))
      .on('set', this.handleThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).props.minValue = 16;
    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).props.maxValue = 32;
    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).props.minValue = 16;
    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).props.maxValue = 32;
    
    this.informationService = new api.hap.Service.AccessoryInformation()
      .setCharacteristic(api.hap.Characteristic.Manufacturer, 'Custom Manufacturer')
      .setCharacteristic(api.hap.Characteristic.Model, 'Custom Model');

    api.on('didFinishLaunching', () => {
      this.airConditionerAPI.connect();
    });

    setInterval(() => {
      this.airConditionerAPI.getState();
      // this.service.getCharacteristic(this.api.hap.Characteristic.On).setValue(this.airConditionerAPI.model.power === State.on);
    }, 5000);

  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.service,
    ];
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  handleActiveGet(callback) {
    this.log.debug('Triggered GET Active');

    // set this to a valid value for Active
    let currentValue = 0;
    if (this.airConditionerAPI.model.power === State.on) {
      currentValue = 1;
    } 
    // const currentValue = 1;

    callback(null, currentValue);
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  handleActiveSet(value, callback) {
    this.log.debug('Triggered SET Active:', value);
    if (value === 1) {
      this.airConditionerAPI.setPower(State.on);
    } else {
      this.airConditionerAPI.setPower(State.off);
    }
    callback(null);
  }

  //   export declare class CurrentHeaterCoolerState extends Characteristic {
  //     static readonly INACTIVE = 0;
  //     static readonly IDLE = 1;
  //     static readonly HEATING = 2;
  //     static readonly COOLING = 3;
  //     static readonly UUID: string;
  //     constructor();
  // }
  /**
   * Handle requests to get the current value of the "Current Heater Cooler State" characteristic
   */
  handleCurrentHeaterCoolerStateGet(callback) {
    this.log.debug('Triggered GET CurrentHeaterCoolerState');

    // set this to a valid value for CurrentHeaterCoolerState
    let currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    if (this.airConditionerAPI.model.mode === Mode.cooling) {
      currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.COOLING;
    } else if (this.airConditionerAPI.model.mode === Mode.heating) {
      currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.HEATING;
    } else {
      currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.IDLE;
    }

    callback(null, currentValue);
  }

  //   export declare class TargetHeaterCoolerState extends Characteristic {
  //     static readonly AUTO = 0;
  //     static readonly HEAT = 1;
  //     static readonly COOL = 2;
  //     static readonly UUID: string;
  //     constructor();
  // }
  /**
   * Handle requests to get the current value of the "Target Heater Cooler State" characteristic
   */
  handleTargetHeaterCoolerStateGet(callback) {
    this.log.debug('Triggered GET TargetHeaterCoolerState');

    let currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.AUTO;
    if (this.airConditionerAPI.model.mode === Mode.cooling) {
      currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.COOL;
    } else if (this.airConditionerAPI.model.mode === Mode.heating) {
      currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.HEAT;
    } else if (this.airConditionerAPI.model.mode === Mode.auto) {
      currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.AUTO;
    }

    // set this to a valid value for TargetHeaterCoolerState

    callback(null, currentValue);
  }

  /**
   * Handle requests to set the "Target Heater Cooler State" characteristic
   */
  handleTargetHeaterCoolerStateSet(value, callback) {
    this.log.debug('Triggered SET TargetHeaterCoolerState:', value);

    if (value === this.api.hap.Characteristic.TargetHeaterCoolerState.AUTO) {
      this.airConditionerAPI.setMode(Mode.auto);
    } else if (value === this.api.hap.Characteristic.TargetHeaterCoolerState.COOL) {
      this.airConditionerAPI.setMode(Mode.cooling);
    } else if (value === this.api.hap.Characteristic.TargetHeaterCoolerState.HEAT) {
      this.airConditionerAPI.setMode(Mode.heating);
    } 

    callback(null);
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  handleCurrentTemperatureGet(callback) {
    this.log.debug('Triggered GET CurrentTemperature');

    // set this to a valid value for CurrentTemperature
    const currentValue = this.airConditionerAPI.model.ambientTemp;

    callback(null, currentValue);
  }

  handleThresholdTemperatureSet(value, callback) {
    this.log.debug('Triggered SET ThresholdTemperature:', value);
    
    this.airConditionerAPI.setTemp(value);

    callback(null);
  }

  handleThresholdTemperatureGet(callback) {
    this.log.debug('Triggered GET ThresholdTemperature');

    // set this to a valid value for CurrentTemperature
    const currentValue = this.airConditionerAPI.model.temp;

    callback(null, currentValue);
  }
}