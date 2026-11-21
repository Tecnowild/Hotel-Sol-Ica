/* eslint-disable no-restricted-globals */
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
    new NavigationRoute(
        createHandlerBoundToURL(new URL("index.html", self.registration.scope).href),
        {
            denylist: [/^\/api(?:\/|$)/],
        }
    )
);
