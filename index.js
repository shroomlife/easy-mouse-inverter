const regedit = require('regedit');

const keys = ['HKLM', 'SYSTEM', 'CurrentControlSet', 'Enum', 'HID'];

const keyString = keys.join('\\');

let changedDevices = 0;

regedit.list(keyString, (err, result) => {
  const foundKeys = result[keyString].keys;

  foundKeys.forEach((keyIndexName) => {
    let childKeys = keys.slice(0);
    childKeys.push(keyIndexName);

    let childKeyString = childKeys.join('\\');

    regedit.list(childKeyString, (err, result) => {
      const keyCheckItemName = result[childKeyString].keys.shift();

      let checkKeys = childKeys.slice(0);
      checkKeys.push(keyCheckItemName);
      let checkKeyString = checkKeys.join('\\');

      regedit.list(checkKeyString, (err, result) => {
        const checkKeyChildFirstKey = result[checkKeyString].keys.shift();
        if (
          typeof result[checkKeyString] !== 'undefined' &&
          typeof result[checkKeyString].values === 'object'
        ) {
          const checkData = result[checkKeyString].values;

          if (typeof checkData.Mfg !== 'undefined' && typeof checkData.Mfg.value !== 'undefined') {
            const MfgCheckValue = String(checkData.Mfg.value);

            if (MfgCheckValue.indexOf('mouse') !== -1) {
              let deviceParameterKeys = checkKeys.slice(0);
              deviceParameterKeys.push(checkKeyChildFirstKey);
              let deviceParameterKeysString = deviceParameterKeys.join('\\');

              regedit.list(deviceParameterKeysString, (err, result) => {
                const deviceParameters = result[deviceParameterKeysString].values;

                if (typeof deviceParameters.FlipFlopWheel !== 'undefined') {
                  const currentFlipFlopValue = deviceParameters.FlipFlopWheel;

                  if (currentFlipFlopValue.type === 'REG_DWORD' && currentFlipFlopValue.value === 0) {
                    let putObject = {};
                    putObject[deviceParameterKeysString] = {
                      FlipFlopWheel: {
                        value: 1,
                        type: 'REG_DWORD'
                      }
                    };

                    regedit.putValue(putObject, (err, result) => {
                      changedDevices++;
                      console.log('ADDED FIX TO', childKeyString)
                    });
                  }
                }
              });
            }
          }
        }
      });
    });
  });
});
