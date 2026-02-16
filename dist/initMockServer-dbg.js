sap.ui.define([
    "sap/ui/core/ComponentContainer",
    "sap/m/MessageBox"
], function (ComponentContainer, MessageBox) {
    "use strict";

    sap.ui.require([
        "my/fiori/app/localService/mockserver"
    ], function (mockserver) {
        // initialize the mock server
        console.log("Initializing Mock Server...");
        mockserver.init().catch(function (oError) {
            console.error("Mock Server Init Failed:", oError);
            MessageBox.error(oError.message);
        }).finally(function () {
            console.log("Initializing Component...");
            // initialize the embedded component on the HTML page
            new ComponentContainer({
                name: "my.fiori.app",
                async: true,
                settings: {
                    id: "fiori_app"
                }
            }).placeAt("content");
        });
    });
});
