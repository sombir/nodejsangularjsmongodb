import {Component,OnInit, ViewChild} from "@angular/core";
import { Subject } from 'rxjs/Subject';
import {CDSService} from '../../services/httpAPI.service';
import { DataTableDirective } from 'angular-datatables';
import { ResponseData, ErrorResponse } from '../../models/response';
import { SharedService } from '../../services/shared.service';

@Component({
    selector: "app-api-key",
    templateUrl: "./api-key.component.html",
    styleUrls: ["./api-key.component.css"]
})
export class ApiKeyComponent implements OnInit {
    @ViewChild(DataTableDirective) 
    dataTableElement: DataTableDirective = null;
    dtOptions: any = {};
    dt:any;
    dtTrigger: Subject<any> = new Subject();
    selectedTokens = [];
    selectedAll: any;
    apiKeyStatus: any;
    apiKeysList = [];
    message: String = '';
    modelTitle: String = '';
    isDisabled : boolean = true;
    tableLength:number=0;
    errorResponse:ErrorResponse;
    constructor(private apiData: CDSService, private sharedService : SharedService) {}
    selectAll(e: any) {
        let selectedKeys = [];
        let view = this;
        view.selectedTokens=[];
        view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
            view.tableLength=(dtInstance.page.info().length>=view.apiKeysList.length)?view.apiKeysList.length:dtInstance.page.info().length;
            for (let i = 0; i < (view.tableLength+1); i++) {
                let apikey=$('table tbody tr:nth-child('+i+') td:nth-child(2)').text();
                let index= view.apiKeysList.indexOf(view.apiKeysList.find(function(obj) : boolean {
                    return obj.key==apikey;
                }));
                console.log('table length : ' + view.tableLength);
                console.log('i : ' + i);
                console.log('apikey : ' + apikey);
                console.log('index : ' + index);
                /*if(i==(view.tableLength+1)) {
                    if($('#selectAllCheck').prop('checked')) {
                        $('#selectAllCheck').prop('checked', false); 
                    } else {
                        $('#selectAllCheck').prop('checked', true); 
                    }
                }*/
                if((apikey!=undefined) && (apikey!=null) && (apikey!='')){
                    view.apiKeysList[index].select = e.target.checked;
                    view.selectToken(view.apiKeysList[index], e.target.checked);
                }
            }
        });

        /*for (var i = 0; i < view.apiKeysList.length; ++i) {
            view.apiKeysList[i].select = e.target.checked;
            console.log(view.apiKeysList[i].select);
            selectedKeys[i] = view.apiKeysList[i];
            if(e.target.checked){
                view.selectToken(selectedKeys[i], true);
            }
            else{
                view.selectToken(selectedKeys[i], false);
                view.selectedTokens = [];
            }
        }
        selectedKeys =[];*/
    }
    ngOnInit() {
        let view = this;
        $("body").css("background-color", "#D9E0E7");
        view.getAPIList();
    }
    selectToken(data: any, isSelected: boolean) {
        let view = this;
        let index = view.selectedTokens.indexOf(view.selectedTokens.find(function(obj) : boolean{
            return obj.key == data.key;
        }));
        // view.selectedTokens=[];
        //console.log("selected token",data);
        if (isSelected) {
            if(index==-1) {
                view.selectedTokens.push(data);
            }
            if(view.selectedTokens.length >= 1)
                view.isDisabled = false;
            else
                view.isDisabled = true;
            console.log("selected tokens", view.selectedTokens);
        } else {
            let index = view.selectedTokens.indexOf(
                view.selectedTokens.find(function(obj): boolean {
                    return obj == data;
                })
                );
            view.selectedTokens.splice(index, 1);
            if(view.selectedTokens.length >= 1)
                view.isDisabled = false;
            else
                view.isDisabled = true;
            console.log("after splice", view.selectedTokens);
            view.selectedAll = false;
        }       
        if(($('#apiTable tr').length-1) == this.selectedTokens.length) {
            this.selectedAll=true;
        } else {
            this.selectedAll=false;
        } 

        if (this.selectedTokens.length == this.apiKeysList.length) {
            console.log(this.apiKeysList.every(function(item:any) {return item.select == true}));
            this.selectedAll = this.apiKeysList.every(function(item:any) {
                return item.select == true;
            });
        }
    }
    getAPIList() {
        let view = this;
        $('#overlay').show();
        view.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 10,
            dom: "Z<'row'<'col-6'i><'col-6'f>>" +
            "<'row'<'col-12'tr>>" +
            "<'row'<'col-8'l><'col-4'p>>",
            columnDefs: [ { orderable: false, width:"30px", targets: [0] }, { width: "300px", targets: [1] }, { width : "125px", targets: [2]} ],
            language: {
                emptyTable : "No data available in table",
                info: "_START_ - _END_ of _TOTAL_",
                infoEmpty: "0 - 0 of 0",
                lengthMenu:     "Show _MENU_",
                zeroRecords:"",
                searchPlaceholder: "Search API Key"
            }
        };
        view.apiData.listAPIKeys().subscribe(function(val) {
            console.log("list api keys", val.list);
            view.apiKeysList = val.list;
            view.dtTrigger.next();
            view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
                view.dt=dtInstance;
            });
            setTimeout(()=> {
                view.dt.on( 'draw.dt', function () {
                    let checkedCount=0;
                    let uncheckedCount=0;
                    console.log('searched ' + view.dt.search());
                    let numberofrows = $('#apiTable tbody tr').length;
                    console.log('number of rows ' +  numberofrows);
                    for (let i=1; i < (numberofrows+1); i++) {
                        let isChecked = $('table tbody tr:nth-child('+i+') td:nth-child(1) input:checkbox').is( ":checked" );
                        if(isChecked) {
                            checkedCount+=1;
                        } else {
                            uncheckedCount+=1;
                        }
                        if(i==(numberofrows)) {
                            if(uncheckedCount>0) {
                                $('#selectAllCheck').prop('checked', false); 
                            } else {
                                $('#selectAllCheck').prop('checked', true);  
                                let event = {target:{checked:true}};
                                view.selectAll(event);           
                            }
                        }
                    }
                    
                });
            }, 1000);
            $(".sorting_disabled").css('background-image', 'none');
            $('table.dataTable thead tr.cancel_sorting th:first-child').removeClass('sorting_asc');
            $('table.dataTable thead tr.cancel_sorting th:first-child').addClass('sorting_disabled');
            $('#overlay').hide();
        },function(err){
            view.errorResponse = err;

            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.modelTitle = view.errorResponse.title;
                view.message = view.errorResponse.message;
                $('#modelDialog').modal('show');
            }
        });
    }
    createAPIKey() {
        let view = this;
        if (( < HTMLInputElement > document.getElementById("status")).checked == true) {
            view.apiKeyStatus = 'Active';
        } else {
            view.apiKeyStatus = 'Suspended';
        }

        let apiKeyDesc = ( < HTMLInputElement > document.getElementById("desc")).value;

        const paramObj = {
            status: view.apiKeyStatus,
            description: apiKeyDesc
        }

        view.apiData.createAPIkey(paramObj).subscribe(function(val) {
            if (val.success) {
                view.modelTitle = 'Success';
                view.message = val.message;
                $("#createAPIKeyModelDialog .close").click();
            } else {
                view.modelTitle = 'Error';
                view.message = val.message;
            }
            view.refreshTable();

            $('#modelDialog').modal('show');
        },function(err){
            view.errorResponse = err;
            $('.modal-backdrop').hide();
            $("#createAPIKeyModelDialog .close").click();

            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.modelTitle = view.errorResponse.title;
                view.message = view.errorResponse.message;
                $('#modelDialog').modal('show');
            }
        });
        ( < HTMLInputElement > document.getElementById("status")).checked = true;
        ( < HTMLInputElement > document.getElementById("desc")).value = '';
    }

    refreshTable(){
        let view = this;
        this.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
        // Destroy the table first
        dtInstance.destroy();
        // Call the dtTrigger to rerender again
        view.getAPIList();
        view.isDisabled =true;
    });
    }

    deleteAPIKey() {
        $('#deleteAPIKeyModal .close').click();
        let view = this;
        if (!view.selectedTokens.length) {
            view.modelTitle = 'Info';
            view.message = 'Select atleast one API Key to delete';
            $('#modelDialog').modal('show');
        } else if (view.selectedTokens.length == 1) {
            view.apiData.deleteAPIKey(view.selectedTokens[0].key).subscribe(function(val) {
                if (val.success) {
                    view.modelTitle = 'Success';
                } else {
                    view.modelTitle = 'Error';
                }
                view.refreshTable();
                view.message = val.message;
                $('#modelDialog').modal('show');
            },function(err){
                view.errorResponse = err;
                $('.modal-backdrop').hide();

                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.modelTitle = view.errorResponse.title;
                    view.message = view.errorResponse.message;
                    $('#modelDialog').modal('show');
                }
            });
            view.selectedTokens = [];
        } else if (view.selectedTokens.length > 1) {
            let arr = [];
            for (let i = 0; i < view.selectedTokens.length; i++) {
                arr[i] = view.selectedTokens[i].key;
            }
            let myVar1 = arr.join();
            arr = [];
            view.apiData.bulkAPIKeyDelete(myVar1).subscribe(function(val) {
                if (val.success) {
                    view.modelTitle = 'Success';
                } else {
                    view.modelTitle = 'Error';
                }
                view.refreshTable();
                view.message = val.message;
                $('#modelDialog').modal('show');
            },function(err){
                view.errorResponse = err;
                $('.modal-backdrop').hide();

                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.modelTitle = view.errorResponse.title;
                    view.message = view.errorResponse.message;
                    $('#modelDialog').modal('show');
                }
            });
            view.selectedTokens = [];
            view.selectedAll = false;
        }
    }

    bulkAPIUpdate(){
        $('#updateAPIModal .close').click();
        let view = this;
        if (!view.selectedTokens.length) {
            view.modelTitle = 'Info';
            view.message = 'Select API Keys to Update';
            $('#modelDialog').modal('show');
        }
        else{
            let arr = [];
            for (let i = 0; i < view.selectedTokens.length; i++) {
                arr[i] = view.selectedTokens[i].key;
            }
            let myVar1 = arr.join();
            arr = [];
            if (( < HTMLInputElement > document.getElementById("apiKeystatus")).checked == true) {
                view.apiKeyStatus = 'Active';
            } 
            else {
                view.apiKeyStatus = 'Suspended';
            }
            console.log("check status",view.apiKeyStatus);
            view.apiData.bulkAPIStatusUpdate(myVar1,view.apiKeyStatus).subscribe(function(val) {
                if (val.success) {
                    view.modelTitle = 'Success';
                } else {
                    view.modelTitle = 'Error';
                }
                view.refreshTable();
                view.message = val.message;
                $('#modelDialog').modal('show');
            },function(err){
                view.errorResponse = err;
                $('.modal-backdrop').hide();

                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.modelTitle = view.errorResponse.title;
                    view.message = view.errorResponse.message;
                    $('#modelDialog').modal('show');
                }
            });
            view.selectedTokens = [];
            view.selectedAll = false;

        }
    }

    onOk() {
        $("#modelDialog .close").click();
    }
    cancel(){
        $('#deleteAPIKeyModal .close').click();
    }
}