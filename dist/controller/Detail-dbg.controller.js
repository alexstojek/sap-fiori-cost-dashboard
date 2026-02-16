sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("my.fiori.app.controller.Detail", {

        formatter: {
            formatDateRange: function (oStartDate, oEndDate) {
                if (!oStartDate || !oEndDate) { return ""; }
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ style: "medium" });
                return oDateFormat.format(oStartDate) + " - " + oDateFormat.format(oEndDate);
            }
        },

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sCostCenterID = oEvent.getParameter("arguments").CostCenterID;

            // Create a view model to store the dynamic context title
            var oViewModel = new sap.ui.model.json.JSONModel({
                currentContext: sCostCenterID
            });
            this.getView().setModel(oViewModel, "view");

            // Load Report Data (Mock)
            var oReportModel = new sap.ui.model.json.JSONModel();
            oReportModel.loadData(sap.ui.require.toUrl("my/fiori/app/localService/mockdata/ReportData.json"));
            this.getView().setModel(oReportModel, "report");
        }
    });
});
