import { Component, OnInit, EventEmitter, Input, Output, ViewChild, OnChanges, SimpleChanges} from '@angular/core';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { CDSService } from '../../../services/httpAPI.service';
import {CookieService} from 'angular2-cookie/core';
import { DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs/Subject';
import * as $ from 'jquery';
import { ClusterData, ClusterListData, ClusterTableData } from '../../../models/cluster';
import { ResponseData, ErrorResponse } from '../../../models/response';
import { SharedService } from '../../../services/shared.service';


@Component({
  selector: 'clusterList',
  templateUrl: './clusterList.component.html',
  styleUrls: ['./clusterList.component.css']
})
export class ClusterListComponent implements OnInit, OnChanges {
  @ViewChild(DataTableDirective) 
  dataTableElement: DataTableDirective = null;
  dtOptions: any = {};
  dt:any;
  btnEnabled: boolean = true;
  dtTrigger: Subject<any> = new Subject();
  @Output() messageEvent = new EventEmitter<number>();
  @Output() deleteClusterEvent = new EventEmitter<ClusterData[]>();
  @Output() isEnabled = new EventEmitter<boolean>();
  @Input() doAddRefresh:boolean=false;
  @Input() doDeleteRefresh:boolean=false;
  @Input() doEditRefreshList:boolean=false;
  @Input() doImportRefresh:boolean=false;
  @Input() refreshcluster : boolean = false;
  showLicense:boolean=false;
  title = 'app';
  response : ClusterListData;
  errorResponse : ErrorResponse;
  count : number = 0;
  data: any;
  clusterList : ClusterData[];
  allClusterList:ClusterData[];
  selectedClusters : ClusterData[] = [];
  tableInfo : any;
  table : any;
  isDefault : boolean = true;
  status : string;
  tableData : ClusterTableData[] = [];
  selectedAll: any;
  modelTitle: String = '';
  modelMessage: String = '';
  tableLength:number=0;
  clusterIPv4Pattern = /^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})$/;
  clusterIPv6Pattern = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  constructor(private router: Router, private apiData: CDSService, private _cookieService:CookieService, private location: Location, private route : ActivatedRoute, private sharedService:SharedService){
  }

  selectAll(e: any){
    let view=this;
    let cluster=[];
    view.selectedClusters=[];
    view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
      view.tableLength=(dtInstance.page.info().length>=view.tableData.length)?view.tableData.length:dtInstance.page.info().length;
      for (let i = 0; i < (view.tableLength+1); i++) {
        let clusterName=$('table tbody tr:nth-child('+i+') td:nth-child(2) a').text();
        let index= view.tableData.indexOf(view.tableData.find(function(obj) : boolean {
          return obj.name==clusterName;
        }));
        
        if((clusterName!=undefined) && (clusterName!=null) && (clusterName!='')){
          view.tableData[index].select = e.target.checked;
          view.selectCluster(view.tableData[index], e.target.checked);
        }
      }
    });

  }

  ngOnInit() {
    let view=this;
    $('#overlay').show();
    view.getClusterData();
    view.sharedService.deleted.subscribe(deleted=>{
      console.log(deleted);
      $('#selectAllCheck').prop('checked', false); 
      view.selectedAll=false;
    });

    view.sharedService.doRefreshCulter.subscribe(dorefresh=>{
      let checkshowclusterFlag = localStorage.getItem("checkshowcluster");
      if(dorefresh && checkshowclusterFlag == 'true') {
        localStorage.setItem("checkshowcluster", "false");
        view.refreshClusterList();
      }
    });

    view.sharedService.onlineCluster.subscribe(val=>{
      view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
        console.log('dtinstance.search(val)');
        dtInstance.search(val).draw();
      });
    });
    view.sharedService.flaggedCluster.subscribe(val=>{
      view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
        console.log('dtinstance.search(val)');
        dtInstance.search(val).draw();
      });
    });
    view.sharedService.offlineCluster.subscribe(val=>{
      view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
        console.log('dtinstance.search(val)');
        dtInstance.search(val).draw();
      });
    });

  }

  ngOnChanges(changes: SimpleChanges) {
    for (let propName in changes) {  
      let change = changes[propName];
      console.log(propName);
      if (propName == "doAddRefresh" || propName == "doDeleteRefresh" || propName == "doImportRefresh" || propName == "refreshcluster" || propName == "doEditRefreshList") {
        console.log(change);
        if(!change.firstChange) {
          this.refreshClusterList();
        }
      }
    }
  }

  selectCluster(cluster : ClusterTableData, isSelected: boolean){
    let index = this.selectedClusters.indexOf(this.selectedClusters.find(function(obj) : boolean{
      return obj.ip == cluster.ip;
    }));
    console.log(index);
    if (isSelected) {
      this.btnEnabled = false;
      this.isEnabled.emit(this.btnEnabled);
      for (let i = 0; i < this.clusterList.length; ++i) {
        if (this.clusterList[i].ip == cluster.ip) {
          if (index == -1 ) {
            this.selectedClusters.push(this.clusterList[i]);
          }
          console.log(this.selectedClusters);
        }
        if(this.selectedClusters.length >= 1)
          this.btnEnabled = false;
        else
          this.btnEnabled = true;
      }
      this.isEnabled.emit(this.btnEnabled);
    } else{
      this.btnEnabled = true;
      this.isEnabled.emit(this.btnEnabled);
      this.selectedClusters.splice(index,1);
      if(this.selectedClusters.length >= 1){
        this.btnEnabled = false;
        this.isEnabled.emit(this.btnEnabled);
      }	
      else{
        this.btnEnabled = true;
        this.isEnabled.emit(this.btnEnabled);
      }

      console.log(this.selectedClusters);
      this.selectedAll = false;
    }
    if (this.selectedClusters.length > 0) {
      this.sharedService.getClusterTableEntries(($('#clusterTable tr').length-1));
      this.deleteClusterEvent.emit(this.selectedClusters);
    }
    if(($('#clusterTable tr').length-1) == this.selectedClusters.length) {
      this.selectedAll=true;
    } else {
      this.selectedAll=false;
    }
    if (this.selectedClusters.length == this.tableData.length) {
      this.selectedAll = this.tableData.every(function(item:any) {
        return item.select == true;
      });
    }

    
  }

  getClusterData(){

    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      // scrollX:true,
      dom: "Z<'row'<'col-6'i><'col-6'f>>" +
      "<'row'<'col-12'tr>>" +
      "<'row'<'col-8'l><'col-4'p>>",
      columnDefs: [ { orderable: false, targets: [0] }, { width: '150px', targets: [1] }, { width: "150px", targets: [2] }, { width: "180px", targets: [3] }, { width: "120px", targets: [4] }, { width: "125px", targets: [5] }, { width: "125px", targets: [6] } ],
      language: {
        emptyTable : "No data available in table",
        info: "_START_ - _END_ of _TOTAL_",
        infoEmpty: "0 - 0 of 0",
        lengthMenu:     "Show _MENU_",
        zeroRecords:"",
        searchPlaceholder: "Search Cluster"
      }
    };
    let view = this;
    this.apiData.cdsCLusterListService().subscribe(function(val){
      console.log('cdsCLusterListService cluster list');
      view.response = val;
      view.clusterList = view.response.list;
      view.count = view.response.totalCount;
      view.sharedService.sendClusterList(view.response);
      $('#overlay').hide();
      view.getTableDetails(view.clusterList);
      //view.messageEvent.emit(view.count);
      //$(".sorting_disabled").css('background-image', 'none');
      //$('table.dataTable thead tr.cancel_sorting th:first-child').removeClass('sorting_asc');
      //$('table.dataTable thead tr.cancel_sorting th:first-child').addClass('sorting_disabled');
      
    },function(err){
      view.errorResponse = err;

      if (view.errorResponse.message.includes('Session')) {
        view.sharedService.logout(true);
      } else {
        view.modelTitle = view.errorResponse.title;
        view.modelMessage = view.errorResponse.message;
        $('#clusterListModelDialog').modal('show');
      }
    });
  }

  getTableDetails(clusters:ClusterData[]){
    let view = this;
    view.tableData = [];
    for (let i = 0; i < clusters.length; ++i) {
      let tableDataItem : ClusterTableData = new ClusterTableData(clusters[i].name,clusters[i].ip,false,clusters[i].status,0,"",0,0,0,0,0,0,0,0,0,0,false,0,'','','',false);
      tableDataItem.numberofaps = clusters[i].numberofaps;
      tableDataItem.defaultcluster = clusters[i].defaultcluster;
      tableDataItem.loginid=clusters[i].loginid;
      tableDataItem.password=clusters[i].password;
      tableDataItem.tag=clusters[i].tag;
      tableDataItem.apsimported=clusters[i].apsimported;
      if (clusters[i].hasOwnProperty('stats') && (clusters[i].stats != null)) {
        console.log("have stats");

        if(clusters[i].stats.hasOwnProperty('systemsummary') && (clusters[i].stats.systemsummary != null)){
          tableDataItem.version = clusters[i].stats.systemsummary.version;
          tableDataItem.connectionStatus = 1;
          let apLicenseUsedPercent:number = (clusters[i].stats.systemsummary.apLicenseConsumed/clusters[i].stats.systemsummary.apLicenseTotal)*100;
          console.log(apLicenseUsedPercent);
          // tableDataItem.APLicenseUsed = Math.ceil((clusters[i].stats.systemsummary.apLicenseConsumed/clusters[i].stats.systemsummary.apLicenseTotal)*100);
          if (clusters[i].stats.systemsummary.apLicenseTotal != 0) {
            tableDataItem.APLicenseUsed = Math.ceil((clusters[i].stats.systemsummary.apLicenseConsumed/clusters[i].stats.systemsummary.apLicenseTotal)*100);
          } else{
            tableDataItem.APLicenseUsed='';
          }
          console.log(tableDataItem.APLicenseUsed);
        }


        if(clusters[i].stats.hasOwnProperty('zoneinventory') && (clusters[i].stats.zoneinventory != null)){
          for (let j = 0; j < clusters[i].stats.zoneinventory.zonesummary.length; ++j) {
            tableDataItem.onlineAP = tableDataItem.onlineAP + clusters[i].stats.zoneinventory.zonesummary[j].apOnline;
            tableDataItem.offlineAP = tableDataItem.offlineAP + clusters[i].stats.zoneinventory.zonesummary[j].apOffline;
            tableDataItem.flaggedAP = tableDataItem.flaggedAP + clusters[i].stats.zoneinventory.zonesummary[j].apFlagged;
          }
        }

        if(clusters[i].stats.hasOwnProperty('cplist') && (clusters[i].stats.cplist != null)){
          for (let j = 0; j < clusters[i].stats.cplist.length; ++j) {
            if (clusters[i].stats.cplist[j].status.includes('online')) {
              tableDataItem.onlineCP = tableDataItem.onlineCP + 1;
            } else if (clusters[i].stats.cplist[j].status.includes('offline')) {
              tableDataItem.offlineCP = tableDataItem.offlineCP + 1;
            } else if (clusters[i].stats.cplist[j].status.includes('flagged')) {
              tableDataItem.flaggedCP = tableDataItem.flaggedCP + 1;
            }
          }
        }

        if(clusters[i].stats.hasOwnProperty('dplist') && (clusters[i].stats.dplist != null)){
          for (let j = 0; j < clusters[i].stats.dplist.length; ++j) {
            if (clusters[i].stats.dplist[j].status.includes('online')) {
              tableDataItem.onlineDP = tableDataItem.onlineDP + 1;
            } else if (clusters[i].stats.dplist[j].status.includes('offline')) {
              tableDataItem.offlineDP = tableDataItem.offlineDP + 1;
            } else if (clusters[i].stats.dplist[j].status.includes('flagged')) {
              tableDataItem.flaggedDP = tableDataItem.flaggedDP + 1;
            }
          }
        }
      }
          // console.log(tableDataItem);
          view.tableData.push(tableDataItem);
        }
        console.log(view.tableData);
        view.dtTrigger.next();
        view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
          view.dt=dtInstance;
        });
        setTimeout(()=> {
          view.dt.on( 'draw.dt', function () {
            let checkedCount=0;
            let uncheckedCount=0;
            console.log('searched ' + view.dt.search());
            let numberofrows = $('#clusterTable tbody tr').length;
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
      }

      refreshClusterList(){
        let view = this;
        $('#overlay').show();
        console.log("dt : " + view.dataTableElement.dtInstance );
        
        view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
          console.log(dtInstance);
          // Destroy the table first
          dtInstance.destroy();

          // Call the dtTrigger to rerender again
          view.getClusterData();
          view.btnEnabled = true;
          view.isEnabled.emit(view.btnEnabled);
        });
        view.selectedClusters = [];
      }
      
      searchCluster(){
        let view=this;     
      }


      goToClusterDetail(clusterIp){
        this.router.navigate(['dashboard/clusterDetail', clusterIp]);
      }

      onOk(){
        this.modelTitle = '';
        this.modelMessage = '';
        $('#clusterListModelDialog').modal('hide');
      }

      goTovSZ(ip){
        if (ip.match(this.clusterIPv6Pattern)) {
          window.open("https://["+ip+"]:8443/wsg");
        } else{
          window.open("https://"+ip+":8443/wsg");
        }  
      }

    }
