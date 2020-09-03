const AwsIot = require('aws-iot-device-sdk-v2');
const QRCode = require('qrcode');
const config = require('./config')

async function main () {
  console.log('Smart lamp simulator');
  try {
    config_builder = AwsIot.iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(
      './credentials/cert.pem',
      './credentials/private.key');
    const timer = setTimeout(() => { }, 60 * 1000);
    const client_bootstrap = new AwsIot.io.ClientBootstrap();

    config_builder.with_clean_session(true);
    config_builder.with_client_id(config.thingName);
    config_builder.with_endpoint(config.iotEndpoint);

    const mqtt_config = config_builder.build();
    const client = new AwsIot.mqtt.MqttClient(client_bootstrap);
    const connection = client.new_connection(mqtt_config);
    const shadow = new AwsIot.iotshadow.IotShadowClient(connection);
    await connection.connect();
    console.log('Connected to IoT Core...\n');
    await shadow.subscribeToShadowDeltaUpdatedEvents({
      thingName: config.thingName
    }, 1, (error, event) => {
      //  console.debug(event);
      const desiredPowerState = event.state.powerState;
      const reportedState = {
        reported: {
          powerState: desiredPowerState
        }
      };

      shadow.publishUpdateShadow({ thingName: config.thingName, state: reportedState }, 1);

      console.info(`The Smart Lamp is now ${desiredPowerState}`)
    });

    const initState = {
      reported: {
        powerState: "OFF"
      }
    };

    await shadow.publishUpdateShadow({ thingName: config.thingName, state: initState }, 1);


    console.info('This is the QR Code shipped with the Device:');
    let url = `${config.deviceBindingUrl}device/${config.thingName}`
    QRCode.toString(url, { type: 'terminal' }, function (err, string) {
      if (err) throw err;
      console.log(string)
      console.log(`Browse to ${url} to register`)
    })

    setInterval(() => { }, 60);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }


}

main()
