

// let hap: HAP;
import { RemoteInfo, SocketType, Socket } from 'dgram';

import { DgramAsPromised } from 'dgram-as-promised';
// import { AddressInfo } from 'net';
import * as Crypto from 'crypto';
import { EventEmitter } from 'events';


export declare const enum Command {
  authRequst = 0x65,
  authResponse = 0xe9,
  payload = 0xee,
  request = 0x6a
}
export declare const enum State {
  on = 1,
  off = 0
}

export declare const enum Fixation {
  on = 0,
  off = 7
}

export declare const enum Fanspeed {
  low = 3,
  medium = 2,
  high = 1
}

export declare const enum Mode {
  cooling = 0b00000001,
  dry = 0b00000010,
  heating = 0b00000100,
  auto = 0b00000000,
  fan = 0b00000110
}

export class AirConditioner {
   power = State.off
   fanspeed = Fanspeed.medium
   verticalFixation = Fixation.off
   horizontalFixation = Fixation.on
   mode = Mode.cooling
   health = State.off
   clean = State.off
   display = State.on
   mildew = State.off
   sleep = State.off
   turbo = State.off
   mute = State.off
   temp = 24
   ambientTemp = 0

   isEqual(to: AirConditioner): boolean {
     return to.power === this.power &&
     to.fanspeed === this.fanspeed &&
     to.verticalFixation === this.verticalFixation &&
     to.horizontalFixation === this.horizontalFixation &&
     to.health === this.health &&
     to.clean === this.clean &&
     to.display === this.display &&
     to.mildew === this.mildew &&
     to.sleep === this.sleep &&
     to.turbo === this.turbo &&
     to.mute === this.mute &&
     to.temp === this.temp;
   }
}

export declare interface Feedback {
  on(event: 'updateState', listener: (name: AirConditioner) => void): this;
  // on(event: string, listener: Function): this;
}

class ApiFeedback extends EventEmitter {
  emitUpdateState(airCon: AirConditioner): void {
    this.emit('updateState', airCon);
  }
}


export class AirConditionerAPI {

    private defaultIV = new Buffer([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58])
    private defaultKey = new Buffer([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02])

    private id = Buffer.alloc(4, 0);
    private mac = Buffer.alloc(6, 0);
    private count = 1;
    private readonly ip: string;
    model = new AirConditioner()
    feedback = new ApiFeedback()
    // private readonly mac: string;
  
    // private readonly switchService: Service;
    // private readonly informationService: Service;
    private socket = DgramAsPromised.createSocket('udp4');

    constructor(ip: string, mac: string) {
      this.ip = ip;    
      const array = mac.split(':').map((value) => {
        return parseInt(value, 16); 
      });
      this.mac = new Buffer(array);
    }

    on(event: 'updateState', listener: (airCon: AirConditioner) => void) {
      this.feedback.on('updateState', listener);
    }

    async connect() {
      await this.socket.bind();        
      this.socket.setBroadcast(true);
      this.auth();
      // this.socket.setMulticastTTL(128);
      // this.socket.socket.on('listening', () => {
      //   ////console.log('try auth');
        
      // });

      // this.socket.socket.on('connect', () => {
      //   //console.log('connected');
      //   this.auth();
      // });
      this.socket.socket.on('message', (msg, rinfo) => {
        // console.log('recive msg', msg.length);

        const command = msg[0x26];

        const payload = this.decrypt(msg);
        if (command === 0xe9) {
          //console.log('hello success' + payload.length);

          this.defaultKey = Buffer.alloc(0x10, 0);
          payload.copy(this.defaultKey, 0, 0x04, 0x14);

          this.id = Buffer.alloc(0x04, 0);
          payload.copy(this.id, 0, 0x00, 0x04);
          // this.emit('deviceReady');
        } else if (command === 0xee) {

          const packet_type = payload[4]; 
          if (packet_type !== 0x07) {
            return;
          } 

          this.updateStatus(payload);
          this.updateInfo(payload);

        }
      });
    }

    updateModel(device: AirConditioner) {
      // if (this.model.isEqual(device)) {
      //   console.log('equal');
      //   return;
      // } else {
      //   console.log('not equal');
      // }
      this.model = device;
      let temperature = 0; //= 20 - 8
      let temperature_05 = 0;

      if (device.temp < 16) {
        temperature = 16 - 8;
      } else if (device.temp > 32) {
        temperature = 32 - 8;
      } else {
        temperature = device.temp - 8;

        if (Number.isInteger(device.temp)) {
          // console.log('integer');
        } else {
          // console.log('not integer');
          temperature_05 = 1;	
        }
      }

      const payload = Buffer.alloc(23, 0);
      payload[0] = 0xbb;
      payload[1] = 0x00;
      payload[2] = 0x06;  //# Send command, seems like 07 is response
      payload[3] = 0x80;
      payload[4] = 0x00;
      payload[5] = 0x00;
      payload[6] = 0x0f; //# Set status .. #02 -> get info?
      payload[7] = 0x00;
      payload[8] = 0x01;
      payload[9] = 0x01;
      payload[10] = 0b00000000 | temperature << 3 | device.verticalFixation;
      //        payload[10] = 0b00000000 | 8 << 3 | 0
      payload[11] = 0b00000000 | device.horizontalFixation << 5;
      payload[12] = 0b00001111 | temperature_05 << 7;  
      payload[13] = 0b00000000 | device.fanspeed << 5;//self.status['fanspeed'] << 5
      payload[14] = 0b00000000 | device.turbo << 6 | device.mute << 7; 
      payload[15] = 0b00000000 | device.mode << 5 | device.sleep << 2;
      payload[16] = 0b00000000;
      payload[17] = 0x00;
      payload[18] = 0b00000000 | device.power << 5 | device.health << 1 | device.clean << 2;
      payload[19] = 0x00;
      payload[20] = 0b00000000 | device.display << 4 | device.mildew << 3;
      payload[21] = 0b00000000;
      payload[22] = 0b00000000;

      const length = payload.length;

      const request_payload = Buffer.alloc(32, 0);
      request_payload[0] = (length + 2);
      payload.copy(request_payload, 2);


      const crc = this.checksum(payload);
      request_payload[length + 2] = ((crc >> 8) & 0xFF);
      request_payload[length + 3] = crc & 0xFF;

      // console.log('send set request');
      this.send(request_payload, 0x6a);//sendPacket(0x6a, request_payload);
    }

    checksum(data: Buffer) {
      // pseudo header: srcip (16), dstip (16), 0 (8), proto (8), udp len (16)
      const len = data.length;
      // var protocol = packet.protocol === undefined ? 0x11 : packet.protocol
      let sum = 0;
      for (let i = 0; i < len; i += 2) {
        sum += ((data[i] << 8) & 0xff00) + ((data[i + 1]) & 0xff);
      }
      while (sum >> 16) {
        sum = (sum & 0xffff) + (sum >> 16);
      }
      sum = 0xffff ^ sum;
      return sum;
    }

    private updateStatus(payload: Buffer) {
      if (payload.length === 32) {
        // console.log('did update state');
        this.model.temp = 8 + (payload[12] >>3 );// + (0.5 * float(payload[14]>>7));
        ////console.log('this.model.temp ' + this.model.temp);
        this.model.power = payload[20] >> 5 & 0b00000001;
        ////console.log('this.model.power ' + this.model.power);
        this.model.verticalFixation = payload[12] & 0b00000111;
        ////console.log('this.model.verticalFixation ' + this.model.verticalFixation);
        this.model.mode = payload[17] >> 5 & 0b00001111;
        ////console.log('this.model.mode ' + this.model.mode);
        this.model.sleep = payload[17] >> 2 & 0b00000001;
        ////console.log('this.model.sleep ' + this.model.sleep);
        this.model.display = payload[22] >> 4 & 0b00000001;
        ////console.log('this.model.display ' + this.model.display);
        this.model.mildew = payload[22] >> 3 & 0b00000001;
        ////console.log('this.model.mildew ' + this.model.mildew);
        this.model.health = payload[20] >> 1 & 0b00000001;
        ////console.log('this.model.health ' + this.model.health);
        this.model.horizontalFixation = payload[12] & 0b00000111;
        ////console.log('this.model.horizontalFixation ' + this.model.horizontalFixation);
        this.model.fanspeed = payload[15] >> 5 & 0b00000111;
        ////console.log('this.model.fanspeed ' + this.model.fanspeed);
        // this.model.ifeel = payload[15] >> 3& 0b00000001;
        this.model.mute = payload[16] >> 7 & 0b00000001;
        ////console.log('this.model.mute ' + this.model.mute);
        this.model.turbo = payload[16] >> 6 & 0b00000001;
        ////console.log('this.model.turbo ' + this.model.turbo);
        this.model.clean = payload[20] >> 2 & 0b00000001;
        ////console.log('this.model.clean ' + this.model.clean);
        this.getInfo();
        this.feedback.emitUpdateState(this.model);
      }
      
    }

    private updateInfo(payload: Buffer) {
      if (payload.length === 48) {
        const amb_05 = payload[33] / 10;
        const amb = payload[17] & 0b00011111;
        this.model.ambientTemp = amb_05 + amb;
        this.feedback.emitUpdateState(this.model);
      }
    }

    async getState() {
      const magicbytes = Buffer.from('0C00BB0006800000020011012B7E0000', 'hex');
      this.send(magicbytes, 0x6a);
    }

    async getInfo() {
      const magicbytes = Buffer.from('0C00BB0006800000020021011B7E0000', 'hex');
      this.send(magicbytes, 0x6a);
    }

    private async auth() {
      const payload = Buffer.alloc(0x50, 0);
      payload[0x04] = 0x31;
      payload[0x05] = 0x31;
      payload[0x06] = 0x31;
      payload[0x07] = 0x31;
      payload[0x08] = 0x31;
      payload[0x09] = 0x31;
      payload[0x0a] = 0x31;
      payload[0x0b] = 0x31;
      payload[0x0c] = 0x31;
      payload[0x0d] = 0x31;
      payload[0x0e] = 0x31;
      payload[0x0f] = 0x31;
      payload[0x10] = 0x31;
      payload[0x11] = 0x31;
      payload[0x12] = 0x31;
      payload[0x1e] = 0x01;
      payload[0x2d] = 0x01;
      payload[0x30] = 'T'.charCodeAt(0);
      payload[0x31] = 'e'.charCodeAt(0);
      payload[0x32] = 's'.charCodeAt(0);
      payload[0x33] = 't'.charCodeAt(0);
      payload[0x34] = ' '.charCodeAt(0);
      payload[0x35] = ' '.charCodeAt(0);
      payload[0x36] = '1'.charCodeAt(0);
      this.send(payload, 0x65);

    }

    private async send(payload: Buffer, command: number) {

      let packet = Buffer.alloc(0x38, 0);
      if (this.count === 65535) {
        this.count = 1;
      }
      this.count = (this.count + 1) & 0xffff;

      packet[0x00] = 0x5a;
      packet[0x01] = 0xa5;
      packet[0x02] = 0xaa;
      packet[0x03] = 0x55;
      packet[0x04] = 0x5a;
      packet[0x05] = 0xa5;
      packet[0x06] = 0xaa;
      packet[0x07] = 0x55;
      packet[0x24] = 0x2a;
      packet[0x25] = 0x27;
      packet[0x26] = command;
      packet[0x28] = this.count & 0xff;
      packet[0x29] = this.count >> 8;
      packet[0x2a] = this.mac[0];
      packet[0x2b] = this.mac[1];
      packet[0x2c] = this.mac[2];
      packet[0x2d] = this.mac[3];
      packet[0x2e] = this.mac[4];
      packet[0x2f] = this.mac[5];
      packet[0x30] = this.id[0];
      packet[0x31] = this.id[1];
      packet[0x32] = this.id[2];
      packet[0x33] = this.id[3];

      let checksum = 0xbeaf;
      for (let i = 0; i < payload.length; i++) {
        checksum += payload[i];
        checksum = checksum & 0xffff;
      }

      const cipher = Crypto.createCipheriv('aes-128-cbc', this.defaultKey, this.defaultIV);
      payload = cipher.update(payload);

      packet[0x34] = checksum & 0xff;
      packet[0x35] = checksum >> 8;

      packet = Buffer.concat([packet, payload]);

      checksum = 0xbeaf;
      for (let i = 0; i < packet.length; i++) {
        checksum += packet[i];
        checksum = checksum & 0xffff;
      }
      packet[0x20] = checksum & 0xff;
      packet[0x21] = checksum >> 8;
    
      const result = await this.socket.send(packet, 0, packet.length, 80, this.ip);
      
      // const decrypted = this.decrypt(result);
    //   this.log.debug('Recive packet', result);
    }

    private decrypt(response: Buffer): Buffer {
      const enc_payload = Buffer.alloc(response.length - 0x38, 0);
      response.copy(enc_payload, 0, 0x38);

      const decipher = Crypto.createDecipheriv('aes-128-cbc', this.defaultKey, this.defaultIV);
      decipher.setAutoPadding(false);
      let payload = decipher.update(enc_payload);
      const p2 = decipher.final();
      if (p2) {
        payload = Buffer.concat([payload, p2]);
      }

      return payload;
        
    }

    private encrypt(payload: Buffer): Buffer {
      return payload;
    }

    // power = State.off
    // fanspeed = Fanspeed.medium
    // verticalFixation = Fixation.off
    // horizontalFixation = Fixation.on
    // mode = Mode.cooling
    // health = State.off
    // clean = State.off
    // display = State.on
    // mildew = State.off
    // sleep = State.off
    // turbo = State.off
    // mute = State.off
    // temp = 24
    setPower(power: State) {
      if (this.model.power === power) {
        return;
      }
      this.model.power = power;
      this.updateModel(this.model);
    }

    setFanspeed(fanspeed: Fanspeed) {
      if (this.model.fanspeed === fanspeed) {
        return;
      }
      this.model.fanspeed = fanspeed;
      this.updateModel(this.model);
    }

    setVerticalFixation(verticalFixation: Fixation) {
      if (this.model.verticalFixation === verticalFixation) {
        return;
      }
      this.model.verticalFixation = verticalFixation;
      this.updateModel(this.model);
    }

    setHorizontalFixation(horizontalFixation: Fixation) {
      if (this.model.horizontalFixation === horizontalFixation) {
        return;
      }
      this.model.horizontalFixation = horizontalFixation;
      this.updateModel(this.model);
    }

    setMode(mode: Mode) {
      if (this.model.mode === mode) {
        return;
      }
      this.model.mode = mode;
      this.updateModel(this.model);
    }

    setTemp(temp: number) {
      if (this.model.temp === temp) {
        return;
      }
      this.model.temp = temp;
      this.updateModel(this.model);
    }

    setFanSpeed(speed: Fanspeed) {
      if (this.model.fanspeed === speed) {
        return;
      }
      this.model.fanspeed = speed;
      this.updateModel(this.model);
    }

    setMute(state: State) {
      if (this.model.mute === state) {
        return;
      }
      this.model.mute = state;
      this.model.turbo = State.off;
      this.updateModel(this.model);
    }

    setTurbo(state: State) {
      if (this.model.turbo === state) {
        return;
      }
      this.model.mute = State.off;
      this.model.turbo = state ;
      this.updateModel(this.model);
    }

    setSpeed(speed: Fanspeed, turbo: State, mute: State) {
      if (turbo === State.on && mute === State.on) {
        return;
      }
      if (this.model.fanspeed === speed) {
        return;
      }
      this.model.fanspeed = speed;
      this.model.turbo = turbo ;
      this.model.mute = mute ;

      this.updateModel(this.model);
    }

  // setPower(power: State) {

  // }

  // setPower(power: State) {

  // }

  // setPower(power: State) {

  // }
}



