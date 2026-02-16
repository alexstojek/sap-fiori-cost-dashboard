sap.ui.define([
    "sap/ui/core/util/MockServer",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log"
], function (MockServer, JSONModel, Log) {
    "use strict";

    var oMockServer,
        _sAppPath = "my/fiori/app/",
        _sJsonFilesPath = _sAppPath + "localService/mockdata";

    var oMockServerInterface = {

        /**
         * Initializes the mock server asynchronously.
         * You can configure the delay with the URL parameter "serverDelay".
         * The local mock data in this folder is returned instead of the real data for the OData request.
         * @protected
         * @param {object} [oOptionsParameter] - The options parameter
         * @returns {Promise} a promise that is resolved when the mock server has been started
         */
        init: function (oOptionsParameter) {
            var oOptions = oOptionsParameter || {};

            return new Promise(function (resolve, reject) {
                var sManifestUrl = sap.ui.require.toUrl(_sAppPath + "manifest.json"),
                    oManifestModel = new JSONModel(sManifestUrl);

                console.log("MockServer: Loading manifest from " + sManifestUrl);

                oManifestModel.attachRequestCompleted(function () {
                    console.log("MockServer: Manifest loaded. Configuring...");
                    var sJsonFilesUrl = sap.ui.require.toUrl(_sJsonFilesPath),
                        oMainDataSource = oManifestModel.getProperty("/sap.app/dataSources/mainService"),
                        sMetadataUrl = sap.ui.require.toUrl(_sAppPath + oMainDataSource.settings.localUri),
                        // ensure there is a trailing slash
                        sMockServerUrl = /.*\/$/.test(oMainDataSource.uri) ? oMainDataSource.uri : oMainDataSource.uri + "/";

                    // create
                    oMockServer = new MockServer({
                        rootUri: sMockServerUrl
                    });

                    // configure mock server with the given options or key/value pairs
                    MockServer.config({
                        autoRespond: true,
                        autoRespondAfter: oOptions.delay || 500
                    });

                    // simulate all requests using mock data
                    oMockServer.simulate(sMetadataUrl, {
                        sMockdataBaseUrl: sJsonFilesUrl,
                        bGenerateMissingMockData: true
                    });

                    var aRequests = oMockServer.getRequests();

                    // compose an error response for requesti
                    var fnResponse = function (iErrCode, sMessage, aRequest) {
                        aRequest.response = function (oXhr) {
                            oXhr.respond(iErrCode, {
                                "Content-Type": "text/plain;charset=utf-8"
                            }, sMessage);
                        };
                    };

                    // simulate metadata errors
                    if (oOptions.metadataError) {
                        aRequests.forEach(function (aEntry) {
                            if (aEntry.path.toString().indexOf("$metadata") > -1) {
                                fnResponse(500, "metadata Error", aEntry);
                            }
                        });
                    }

                    // simulate request errors
                    var sErrorParam = oOptions.errorType,
                        iErrorCode = sErrorParam === "badRequest" ? 400 : 500;
                    if (sErrorParam) {
                        aRequests.forEach(function (aEntry) {
                            fnResponse(iErrorCode, sErrorParam, aEntry);
                        });
                    }

                    // set requests and start the server
                    oMockServer.setRequests(aRequests);
                    oMockServer.start();

                    Log.info("Running the app with mock data");
                    resolve();
                });

                oManifestModel.attachRequestFailed(function () {
                    var sError = "Failed to load application manifest";
                    console.error(sError);
                    Log.error(sError);
                    reject(new Error(sError));
                });
            });
        }
    };

    return oMockServerInterface;
});
