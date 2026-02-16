sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("my.fiori.app.controller.CostReport", {

        onCostCenterChange: function (oEvent) {
            var oMultiComboBox = oEvent.getSource();
            var aSelectedKeys = oMultiComboBox.getSelectedKeys();
            var oPSPComboBox = this.byId("pspFilter");
            var oBinding = oPSPComboBox.getBinding("items");

            if (aSelectedKeys.length > 0) {
                var aFilters = [];
                // User Logic: PSP ends with Cost Center ID (or contains it)
                aSelectedKeys.forEach(function (sKey) {
                    aFilters.push(new Filter("ID", FilterOperator.Contains, sKey));
                });
                // Combine with OR for PSP Dropdown
                var oCombinedFilter = new Filter({ filters: aFilters, and: false });
                oBinding.filter(oCombinedFilter);
            } else {
                oBinding.filter([]);
            }

            // Trigger Live Filter on Table
            this._applyFilters();
        },

        onPSPChange: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var sSelectedKey = oComboBox.getSelectedKey();
            var oCostCenterFilter = this.byId("costCenterFilter");

            if (sSelectedKey && sSelectedKey.length >= 6) {
                var sCostCenterID = sSelectedKey.slice(-6);
                oCostCenterFilter.setSelectedKeys([sCostCenterID]);
                MessageToast.show("Kostenstelle automatisch gesetzt: " + sCostCenterID);
            }

            // Trigger Live Filter on Table
            this._applyFilters();
        },

        onSearch: function (oEvent) {
            this._applyFilters(oEvent.getParameter("query"));
        },

        onFilterSearch: function () {
            this._applyFilters();
        },

        _applyFilters: function (sQuery) {
            var aFilters = [];

            // 1. Cost Center Filter
            var oCostCenterFilter = this.byId("costCenterFilter");
            var aSelectedCostCenters = oCostCenterFilter.getSelectedKeys();
            if (aSelectedCostCenters && aSelectedCostCenters.length > 0) {
                var aCCFilters = [];
                aSelectedCostCenters.forEach(function (sKey) {
                    aCCFilters.push(new Filter("ID", FilterOperator.EQ, sKey));
                });
                aFilters.push(new Filter({ filters: aCCFilters, and: false }));
            }

            // 2. PSP Element Filter
            var oPSPFilter = this.byId("pspFilter");
            var sSelectedPSP = oPSPFilter.getSelectedKey();
            if (sSelectedPSP) {
                aFilters.push(new Filter("PSPElement", FilterOperator.EQ, sSelectedPSP));
            }

            // 3. Search Query
            if (sQuery && sQuery.length > 0) {
                var aSearchFilters = [];
                aSearchFilters.push(new Filter("ID", FilterOperator.Contains, sQuery));
                aSearchFilters.push(new Filter("Name", FilterOperator.Contains, sQuery));
                aSearchFilters.push(new Filter("Manager", FilterOperator.Contains, sQuery));
                aSearchFilters.push(new Filter("PSPElement", FilterOperator.Contains, sQuery));
                aFilters.push(new Filter({ filters: aSearchFilters, and: false }));
            }

            // Apply Filters to Table
            var oTable = this.byId("costCenterTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },

        onFilterClear: function () {
            // 1. Reset Inputs
            this.byId("costCenterFilter").setSelectedKeys([]);
            this.byId("pspFilter").setSelectedKey(null);
            this.byId("statusFilter").setSelectedKey("All");
            this.byId("searchField").setValue("");

            // 2. Re-Apply Empty Filters
            this._applyFilters();

            MessageToast.show("Filter zurückgesetzt");
        },

        // Formatters
        statusState: function (sBudget, sActuals) {
            var fBudget = parseFloat(sBudget);
            var fActuals = parseFloat(sActuals);

            if (!fBudget || !fActuals) { return "None"; }
            if (fActuals > fBudget) { return "Error"; }
            else if (fActuals > (fBudget * 0.9)) { return "Warning"; }
            else { return "Success"; }
        },

        utilizationPercent: function (sBudget, sActuals) {
            var fBudget = parseFloat(sBudget);
            var fActuals = parseFloat(sActuals);
            if (!fBudget || !fActuals) { return 0; }
            var fPercent = (fActuals / fBudget) * 100;
            return fPercent > 100 ? 100 : fPercent;
        },

        utilizationText: function (sBudget, sActuals) {
            var fBudget = parseFloat(sBudget);
            var fActuals = parseFloat(sActuals);
            if (!fBudget || !fActuals) { return "0%"; }
            var fPercent = (fActuals / fBudget) * 100;
            return fPercent.toFixed(0) + "%";
        },

        varianceAmount: function (sBudget, sActuals) {
            var fBudget = parseFloat(sBudget);
            var fActuals = parseFloat(sActuals);
            if (isNaN(fBudget) || isNaN(fActuals)) { return ""; }
            return (fBudget - fActuals).toFixed(2);
        },

        onInit: function () {
            // Set default date range (Jan 1, 2026 - Mar 31, 2026)
            var oStartDate = new Date(2026, 0, 1);
            var oEndDate = new Date(2026, 2, 31);

            var oDateRange = this.byId("dateRange");
            if (oDateRange) {
                oDateRange.setDateValue(oStartDate);
                oDateRange.setSecondDateValue(oEndDate);

                // Sync to Model for Detail View
                var oModel = this.getOwnerComponent().getModel("kpi");
                if (oModel) {
                    oModel.setProperty("/Filter/StartDate", oStartDate);
                    oModel.setProperty("/Filter/EndDate", oEndDate);
                }

                // Initial calculation
                this._recalculateData(oStartDate, oEndDate);
            }
        },

        onDateChange: function (oEvent) {
            var oDateRange = oEvent.getSource();
            var oStartDate = oDateRange.getDateValue();
            var oEndDate = oDateRange.getSecondDateValue();

            if (oStartDate && oEndDate) {
                // Sync to Model
                var oModel = this.getView().getModel("kpi");
                oModel.setProperty("/Filter/StartDate", oStartDate);
                oModel.setProperty("/Filter/EndDate", oEndDate);

                this._recalculateData(oStartDate, oEndDate);
                MessageToast.show("Daten für Zeitraum aktualisiert.");
            }
        },

        _recalculateData: function (oStartDate, oEndDate) {
            // Try to get model from View first, then Component
            var oModel = this.getView().getModel("kpi") || this.getOwnerComponent().getModel("kpi");

            if (!oModel) {
                // Safety check: Model might not be ready yet
                return;
            }

            var aTableItems = oModel.getProperty("/TableItems");

            if (!aTableItems) return;

            var iStartMonth = oStartDate.getMonth();
            var iStartYear = oStartDate.getFullYear();
            var iEndMonth = oEndDate.getMonth();
            var iEndYear = oEndDate.getFullYear();

            // Iterate over all items and recalculate based on MonthlyData
            aTableItems.forEach(function (item) {
                var fTotalBudget = 0;
                var fTotalActuals = 0;

                if (item.MonthlyData) {
                    item.MonthlyData.forEach(function (m) {
                        // Check if month is within range
                        // Simple check for same year (2026)
                        if (m.Year >= iStartYear && m.Year <= iEndYear) {
                            if (m.Month >= iStartMonth && m.Month <= iEndMonth) {
                                fTotalBudget += m.Budget;
                                fTotalActuals += m.Actuals;
                            }
                        }
                    });
                }

                // Update item values
                item.Budget = fTotalBudget;
                item.Actuals = fTotalActuals;
            });

            // Update Model to reflect changes
            oModel.setProperty("/TableItems", aTableItems);
        },

        onCostCenterPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oBindingContext = oItem.getBindingContext("kpi");
            var sCostCenterID = oBindingContext.getProperty("ID");
            var sName = oBindingContext.getProperty("Name");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDetail", {
                CostCenterID: sCostCenterID
            });

            MessageToast.show("Öffne Details für: " + sName);
        },

        onInsightPress: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext("kpi").getPath();
            var oModel = this.getView().getModel("kpi");
            var oInsight = oModel.getProperty(sPath);

            MessageToast.show("Analyzing: " + oInsight.Title + "\nAI Suggestion: " + oInsight.Description);
        },

        onDSOPress: function () {
            MessageToast.show("Drill-down to Accounts Receivable...");
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDetail", {
                CostCenterID: "AR"
            });
        },

        onCashPress: function () {
            MessageToast.show("Drill-down to Cash Flow Statement...");
        },

        onInvoicePress: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext("kpi").getPath();
            var oInvoice = this.getView().getModel("kpi").getProperty(sPath);
            MessageToast.show("Opening Invoice: " + oInvoice.DocumentNumber);
        },

        onActionTrigger: function (oEvent) {
            MessageToast.show("Action Triggered: Sending Reminder Email...");
        },

        onFilterChange: function (oEvent) {
            MessageToast.show("Filter Changed: Reloading Dashboard Data...");
            // Here we would reload data based on filters
        }
    });
});
