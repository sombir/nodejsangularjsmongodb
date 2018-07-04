import { Component, OnInit, Inject, ViewChild, ComponentFactoryResolver } from '@angular/core';
import { CDSService } from '../../services/httpAPI.service';
import { adminData, AdminResponse } from '../../models/admin';
import {CookieService} from 'angular2-cookie/core';
import { Router, NavigationEnd, ActivatedRoute, Params } from '@angular/router'; 
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import * as $ from 'jquery';
import { ShowConfirmationAlertComponent } from '../show-confirmation-alert/show-confirmation-alert.component';
import { ResponseData, ErrorResponse } from '../../models/response';
import { SharedService } from '../../services/shared.service';

@Component({
  selector: 'app-root',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // @ViewChild('openDialog', { read: ViewContainerRef }) openDialog: ViewContainerRef;
  title = 'app';
  list : any;
  isDashboardActive: boolean;
  isApiActive: boolean;
  isInventoryActive: boolean;
  isSettingsActive:boolean;
  isActivitiesActive:boolean;
  isBackupsActive:boolean;
  isAPIKeysActive:boolean;
  isUsersActive:boolean;
  isLogsActive:boolean;
  href: string='';
  helpHref: string='';
  targetHelpUrl: string='';
  response:AdminResponse;
  errorResponse: ErrorResponse;
  adminData:adminData;
  dashboardModalTitle: string = '';
  dashboardModalMessage: string = '';
  appVersion : any;
  helpContextMap : any = {
    "dashboard" : "GUID-EAA7BC9D-7603-4726-A143-8F50A73DF523.html", 
    "inventory" : "GUID-F86780F2-4C54-4C3A-92F1-AB19A5D524CC.html", 
    "systemsettings" : "GUID-6BCBB68F-CC8F-4B27-BDF8-B4BE23860C98.html", 
    "adminactivities" : "GUID-F5751E98-8BAC-4E26-9327-61540191FF93.html", 
    "configbackups" : "GUID-8AD6B7D2-781D-4363-AC63-5A16F62ED95C.html", 
    "apitokens" : "GUID-8948DD0C-5E4B-42A4-8FBE-17B652D0E732.html", 
    "userlist": "GUID-2E45C9A9-286D-4F0C-A228-815429336809.html",
    "clusterdetails": "GUID-32AE2E4D-9197-44C6-BD3D-20D9008B299E.html"
  }

  constructor(private router: Router, private _cookieService:CookieService, private apiData: CDSService, @Inject(LOCAL_STORAGE) private storage: WebStorageService, private componentFactoryResolver: ComponentFactoryResolver, private sharedService:SharedService){
    router.events.forEach((event) => {
      if(event instanceof NavigationEnd ) {
        console.log(router.url);
        this.isDashboardActive = false;
        this.isApiActive = false;
        this.isInventoryActive = false;
        this.isSettingsActive = false;
        this.isActivitiesActive = false;
        this.isBackupsActive = false;
        this.isAPIKeysActive = false;
        this.isUsersActive = false;

        if (this.router.url.includes('home')) {
          this.changeClass('Dashboard');
          this.helpHref = this.getHelpLink('dashboard')		  
        } else if (this.router.url.includes('API')) {
          this.changeClass('API');
        } else if (this.router.url.includes('inventory')) {
          this.changeClass('Inventory');
          this.helpHref = this.getHelpLink('inventory')
        } else if (this.router.url.includes('admin') && !this.router.url.includes('Activities')) {
          this.changeClass('Settings');
          this.helpHref = this.getHelpLink('systemsettings')
        }
        else if (this.router.url.includes('Activities')) {
          this.changeClass('Activities');
          this.helpHref = this.getHelpLink('adminactivities')
        }
        else if (this.router.url.includes('configBackups')) {
          this.changeClass('Backups');
          this.helpHref = this.getHelpLink('configbackups')
        }
        else if (this.router.url.includes('apiKey')) {
          this.changeClass('APIKeys');
          this.helpHref = this.getHelpLink('apitokens')
        }
        else if (this.router.url.includes('userList')) {
          this.changeClass('Users');
          this.helpHref = this.getHelpLink('userlist')
        }
        else if (this.router.url.includes('clusterDetail')) {
          this.changeClass('Inventory');
          this.helpHref = this.getHelpLink('clusterdetails')
        }
        else{
          this.helpHref = this.getHelpLink('')
        }
      }
    // NavigationEnd
    // NavigationCancel
    // NavigationError
    // RoutesRecognized
  });
  }
  
  getHelpLink(page){
    if(page == 'dashboard'){
      this.targetHelpUrl = this.helpContextMap.dashboard 
    }else if(page == 'inventory'){
      this.targetHelpUrl = this.helpContextMap.inventory 
    }else if(page == 'systemsettings'){
      this.targetHelpUrl = this.helpContextMap.systemsettings 
    }else if(page == 'adminactivities'){
      this.targetHelpUrl = this.helpContextMap.adminactivities 
    }else if(page == 'configbackups'){
      this.targetHelpUrl = this.helpContextMap.configbackups 
    }else if(page == 'apitokens'){
      this.targetHelpUrl = this.helpContextMap.apitokens 
    }else if(page == 'userlist'){
      this.targetHelpUrl = this.helpContextMap.userlist 
    }else if(page == 'clusterdetails'){
      this.targetHelpUrl = this.helpContextMap.clusterdetails 
    }else {
      this.targetHelpUrl = '' 
    }
	var hostName = window.location.hostname; //'10.150.84.47'; 
	return "https://"+hostName+"/help/"+this.targetHelpUrl	
}

ngOnInit(){
  console.log(this.router.url);
  let view = this;

  view.sharedService.bulkAPUploadErrorMessage.subscribe(msg=>{
    view.showDashboardDialog('Error in Upload', msg);
       // view.modelTitle = 'Error';
       // view.modelMessage = msg;
       //  jQuery('#modelDialogHeader').modal('show');
     });

  view.sharedService.bulkAPUploadSuccessMessage.subscribe(msg=>{
      /* view.modelTitle = 'Success';
       view.modelMessage = msg;
       jQuery('#modelDialogHeader').modal('show');*/
       view.showDashboardDialog('Success', msg);

     });

  view.apiData.getUserAdminDetail().subscribe(function(val){
    console.log(val);
    if(val=='No token') {
      view.showDashboardDialog('Error', 'Session Expired!!! Please login again');
    } else {
      view.response = val;
      view.adminData = view.response.data;
      if (view.response.success) {
        view.storage.set('TimeZone', view.adminData.timezones);
      }
      console.log(view.storage.get('TimeZone'));
    }
    
  },function(err){
    view.errorResponse = err;

    if (view.errorResponse.message.includes('Session')) {
      view.sharedService.logout(true);
    } else if(err.status == 0) {
      view.showDashboardDialog(view.errorResponse.title, view.errorResponse.message);
    }
  });
  view.href = view.router.url;
  view.isDashboardActive = false;
  view.isApiActive = false;
  view.isInventoryActive = false;
  view.isSettingsActive = false;
  view.isActivitiesActive = false;
  view.isBackupsActive = false;
  view.isAPIKeysActive = false;
  view.isUsersActive = false;
  
  if (view.router.url.includes('home')) {
    view.isDashboardActive = true;
  } else if (view.router.url.includes('API')) {
    view.isApiActive = true;
  } else if (view.router.url.includes('inventory')) {
    view.isInventoryActive = true;
  } else if (view.router.url.includes('admin') && !view.router.url.includes('Activities')) {
    view.isSettingsActive = true;
  } else if (view.router.url.includes('Activities')) {
    view.isActivitiesActive = true;
  } else if (view.router.url.includes('configBackups')) {
    view.isBackupsActive = true;
  } else if (view.router.url.includes('apiKey')) {
    view.isAPIKeysActive = true;
  }else if (view.router.url.includes('userList')) {
    view.isUsersActive = true;
  }else if (view.router.url.includes('applicationLogs')) {
      view.isLogsActive = true;
  }
  view.apiData.getCDSVersion().subscribe(function(val){
    if(val.success){
      view.appVersion = val.version;
    }
    else{
      console.log("Error : success:false");
    }
  },function(err){
    view.errorResponse = err;

    if (view.errorResponse.message.includes('Session')) {
      view.sharedService.logout(true);
    } else if(err.status == 0) {
      view.showDashboardDialog(view.errorResponse.title, view.errorResponse.message);
    }
  });
}

goToCluster(){
  this.isDashboardActive = false;
  this.isApiActive = false;
  this.isInventoryActive = false;
  this.isSettingsActive = false;
  this.isActivitiesActive = false;
  this.isBackupsActive = false;
  this.isAPIKeysActive = false;
  this.isUsersActive = false;
  this.isLogsActive = false;

}

goToAPI(){
  console.log("goToAPI");
  window.open("/api-docs");
  this.changeClass('API');
  return false;
}

logout(){
    /*this.modelTitle = 'Logout';
    this.modelMessage = 'Are you sure you want to Logout?';
    jQuery('#modelDialogHeader').modal('show');*/
    this.showDashboardDialog('Logout', 'Are you sure you want to Logout?');

    // var r = confirm("Are you sure you want to Logout");
    // this.showAlertMessage('Logout','Are you sure you want to Logout?');
    // if (r) {
    //   this._cookieService.remove('TOKEN');
    //   this.router.navigate(['login']);    
    // }
  }

  onOk(){
    console.log(this._cookieService.get('TOKEN'));
    if (this.dashboardModalTitle.includes( 'Logout')){
      this._cookieService.remove('TOKEN');
      this.router.navigate(['login']);  
    } else if(!this.dashboardModalTitle.includes('Error in Upload')) {
      if(this.dashboardModalTitle.includes('Error') && ((this._cookieService.get('TOKEN') == undefined) || (this._cookieService.get('TOKEN') == null))) {
        this.router.navigate(['login']);  
      }
    }
    /*this.modelTitle = '';
    this.modelMessage = ''; */
    $('#modelDialogHeader .close').click();

  }

  onCancel(){
    // this.dashboardModalTitle = '';
    // this.dashboardModalMessage = '';
    $('#modelDialogHeader .close').click();
  }
  
  changeClass(type) {
    this.isDashboardActive = false;
    this.isApiActive = false;
    this.isInventoryActive = false;
    this.isSettingsActive = false;
    this.isActivitiesActive = false;
    this.isBackupsActive = false;
    this.isAPIKeysActive = false;
    this.isUsersActive = false;
    this.isLogsActive = false;
    switch (type) {
      case 'Dashboard':
      this.isDashboardActive = true;
      break;
      case 'API':
      // this.isApiActive = true;
      this.ngOnInit();
      break;
      case 'Inventory':
      this.isInventoryActive = true;
      break;
      case 'Settings':
      this.isSettingsActive = true;
      break;
      case 'Activities':
      this.isActivitiesActive = true;
      break;
      case 'Backups':
      this.isBackupsActive = true;
      break;
      case 'APIKeys':
      this.isAPIKeysActive = true;
      break;
      case 'Users':
      this.isUsersActive = true;
      break;
      case 'Application Logs':
      this.isLogsActive = true;
      break;
      default:
      break;
    }
  }
  w3_open() {
    console.log("in w3_open");
    document.getElementById("mySidebar").style.display = "block";
  }
  w3_close() {
    document.getElementById("mySidebar").style.display = "none";
  }

  onEvent(e) {
    //e.preventDefault();
    //e.stopPropagation();
    let view = this;
    //console.log("in onEvent");
    console.log("EVENT-->",e);
    view.isDashboardActive = false;
    view.isApiActive = false;
    view.isInventoryActive = false;
    view.isSettingsActive = false;
    view.isActivitiesActive = false;
    view.isBackupsActive = false;
    view.isAPIKeysActive = false;
    view.isUsersActive = false;
    view.isLogsActive = false;
    switch (e.target.outerText) {
      case 'Dashboard':
      view.isDashboardActive = true;
      break;
      case 'API':
      // this.isApiActive = true;
      view.ngOnInit();
      break;
      case 'Inventory':
      view.isInventoryActive = true;
      break;
      case 'System Settings':
      view.isSettingsActive = true;
      break;
      case 'Admin Activities':
      view.isActivitiesActive = true;
      break;
      case 'Config Backups':
      view.isBackupsActive = true;
      break;
      case 'API Tokens':
      view.isAPIKeysActive = true;
      break;
      case 'Users':
      view.isUsersActive = true;
      break;
      case 'Application Logs':
      this.isLogsActive = true;
      break;
      default:
      break;
    }

  }

  showDashboardDialog(title:string,message:string){
    $('#dashboardModalMessage').text(message);
    $('#dashboardModalTitle').text(title);
    this.dashboardModalMessage=message;
    this.dashboardModalTitle=title;
    if(title=='Error') {
      $('#cancelBtn').hide();
    } else {
      $('#cancelBtn').show();
    }
    $('#openModelDialogHeader').click();
  }

}
