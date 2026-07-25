import UIKit
import Capacitor

// Adopts the UIScene lifecycle (required by a future iOS release). The window is
// still created automatically from Main.storyboard via the UISceneStoryboardFile
// entry in Info.plist, so the Capacitor bridge view controller loads exactly as
// before. This delegate's only job is to forward deep links and universal links
// to Capacitor's ApplicationDelegateProxy, since with scenes those arrive here
// instead of on the AppDelegate.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        // The window is provided by UIKit from Main.storyboard; do not create one
        // here or the app would show two windows.

        // A custom-scheme URL that cold-launched the app.
        if let urlContext = connectionOptions.urlContexts.first {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: urlContext.url,
                options: [:]
            )
        }

        // A universal link (NSUserActivity) that cold-launched the app.
        for activity in connectionOptions.userActivities {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                continue: activity,
                restorationHandler: { _ in }
            )
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let urlContext = URLContexts.first else { return }
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            open: urlContext.url,
            options: [:]
        )
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}
