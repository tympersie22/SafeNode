import Capacitor

final class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativePasskeysPlugin())
#if DEBUG
        precondition(bridge?.plugin(withName: "NativePasskeys") != nil, "NativePasskeys bridge failed to register")
        print("[Safenode] NativePasskeys bridge registered")
#endif
    }
}
