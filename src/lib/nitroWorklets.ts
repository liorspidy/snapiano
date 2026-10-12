import { NitroModules } from "react-native-nitro-modules";
import type { HybridObject } from "react-native-nitro-modules";
import { registerCustomSerializable } from "react-native-worklets";

// Same as Nitro's own installWorkletsSupport, but without its silent try/catch: the camera's worklet runtime cannot copy Nitro
// objects (thread, queue factory) unless this ran, and Nitro hides the reason when it fails.
const boxedProxy = NitroModules.box(NitroModules);
registerCustomSerializable({
    name: "nitro.HybridObject.snapiano",
    determine(value): value is HybridObject<{}> {
        "worklet";
        return boxedProxy.unbox().isHybridObject(value);
    },
    pack(value) {
        "worklet";
        return boxedProxy.unbox().box(value);
    },
    unpack(value) {
        "worklet";
        return value.unbox();
    },
});
