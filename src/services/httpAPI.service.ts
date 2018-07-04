import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpResponse, HttpParams} from '@angular/common/http';
import {Headers, Http, Response, URLSearchParams} from '@angular/http';
import {Observable, ObservableInput} from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/timeout';
import {CookieService} from 'angular2-cookie/core';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import { ResponseData, LoginData, ErrorResponse, HandleErrorResponse } from '../models/response';
import { AdminResponse } from '../models/admin';
import { SharedService } from './shared.service';

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

const baseURL = '/api';

@Injectable()
export class CDSService {
    handleErrorData:HandleErrorResponse;
    
    constructor(private http:HttpClient, private _cookieService:CookieService, private sharedService:SharedService) {
    }


    cdsLoginService(user:string, pwd:string) : Observable<LoginData> {
        // console.log("username : " + user + " , password : " + pwd);
        let data = {
            username : user,
            password : pwd
        };
        const params = new URLSearchParams();
        for(let key in data){
            params.set(key, data[key]) ;
        }
        return this.http.post(baseURL + '/login', (data) , httpOptions).map(this.getLoginData).catch(this.handleLoginError);
    }

    handleLoginError(err ){
        let errorResponse:ErrorResponse=new ErrorResponse('','');
        console.log(err);
        this.handleErrorData=err;

        if ((err.hasOwnProperty('status') && err.status==403)|| (this.handleErrorData.hasOwnProperty('message') && this.handleErrorData.message == "Failed to authenticate token") || (this.handleErrorData.hasOwnProperty('error') && this.handleErrorData.error.hasOwnProperty('message') && this.handleErrorData.error.message == "Failed to authenticate token")) {
            errorResponse.title = 'Error';
            errorResponse.message = 'Session timeout!!! Please login again.';
        } else if(err.status == 0) {
            errorResponse.title = 'Alert';
            errorResponse.message = 'Request timeout!!! Try again later.';
        } else {
            errorResponse.title = 'Alert';
            errorResponse.message = this.handleErrorData.message;
        }
        return Observable.throw(errorResponse);
    }

    getLoginData(res : Response){
        // console.log(res);
        let data = new LoginData(res['success'], res['message'], res['token']);
            // console.log(data);
            return data;
        }

        cdsCLusterListService() : Observable<any> {
            return this.http.get(baseURL + '/controllers' ,this.getToken()).map(function(res){
                console.log(res);
                return res;
            }).catch(this.handleLoginError);
        }

        cdsGraphService() : Observable<any> {
            return this.http.get(baseURL + '/dashboard/summary',this.getToken()).map(function(res){
                this.config = res;
            //console.log(this.config);
            return res;
        }).catch(this.handleLoginError);
        }

        cdsAddClusterService(name:string, ip:string, loginid:string, password:string, tag:string, importaps: boolean, defaultcluster:boolean ) : Observable<Object>{
            let data = {
                name : name,
                password : password,
                ip : ip,
                tag : tag,
                loginid: loginid,
                importaps: (importaps == null)?false:importaps,
                defaultcluster : (defaultcluster == null)?false:defaultcluster
            };
            const params = new URLSearchParams();
            for(let key in data){
                params.set(key, data[key]) ;
            }
            return this.http.post(baseURL + '/controllers', (data) , this.getToken()).map(function(res){
            // console.log(res);
            let data = new ResponseData(res['success'], res['message']);
            // console.log(data);
            return data;
        }).catch(this.handleLoginError);
        }

        cdsDeleteClusterService(ip : string) : Observable<ResponseData> {
            return this.http.delete(baseURL + '/controllers/' + ip ,  this.getToken()).map(function(res){
                let data = new ResponseData(res['success'], res['message']);
                return data;
            }).catch(this.handleLoginError);
        }

	//api to get list of aps
	cdsApsListService() : Observable<any> {
        return this.http.get(baseURL + '/aps' ,this.getToken()).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    cdsAddAPService(apserial:string, apname:string, clusterip:string, zonename:string) : Observable<any>{
        let data = {
            apserial : apserial,
            apname : apname,
            clusterip : clusterip,
            zonename : zonename
        };
        const params = new URLSearchParams();
        for(let key in data){
            params.set(key, data[key]) ;
        }
        return this.http.post(baseURL + '/aps', (data) , this.getToken()).map(function(res){
            // console.log(res);
            let data = new ResponseData(res['success'], res['message']);
            console.log("data : "+data);
            return data;
        }).catch(this.handleLoginError);
    }

    cdsCLusterDetailsService(clusterIp:string) : Observable<any> {
        return this.http.get(baseURL + '/controllers/'+clusterIp, this.getToken()).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }

    cdsCLusterDetailService(clusterIp:string) : Observable<any> {
        return this.http.get(baseURL + '/dashboard/summary/'+clusterIp, this.getToken()).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }

    cdsCLusterDetailServiceLive(clusterIp:string) : Observable<any> {
        return this.http.get(baseURL + '/dashboard/summarylive/'+clusterIp, this.getToken()).map(function(res){
            console.log("UPDATED");
            return res;
        }).catch(this.handleLoginError);
    }

    cdsCLusterConfigSync(clusterIp:string) : Observable<any> {
        return this.http.get(baseURL + '/clusterconfigsync/'+clusterIp, this.getToken()).map(function(res){
            console.log("UPDATED");
            return res;
        }).catch(this.handleLoginError);
    }

    cdsApdeleteService(apserial : string, deleteFromVsz : boolean) : Observable<ResponseData> {
        return this.http.delete(baseURL + '/aps/' + apserial + '/'+deleteFromVsz,  this.getToken()).map(function(res){
            let data = new ResponseData(res['success'], res['message']);
            return data;
        }).catch(this.handleLoginError);
    }

    cdsCheckSession() : Observable<any>{
        return this.http.get(baseURL + '/', this.getToken()).map(function(res){
            let data = new ResponseData(res['success'], "");
            return data;
        }).catch(this.handleLoginError);
    }

    cdsMoveAPService(apserial:string, apname:string, clusterip:string, zonename:string) : Observable<any>{
        let data = {
            apserial : apserial,
            apname : apname,
            clusterip : clusterip,
            zonename : zonename
        };
        console.log(data);
        return this.http.put(baseURL + '/aps/' + apserial, (data), this.getToken()).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);


    }

    cdsBulkAPDelete(apSerialList:string, isCheckedVsz: boolean) : Observable<any>{
        return this.http.delete(baseURL + '/bulkapdelete/' + apSerialList + '/' + isCheckedVsz, this.getToken()).map(function(res){
            let data = new ResponseData(res['success'], res['message']);
            console.log(data);
            return data;
        }).catch(this.handleLoginError);
    }

    cdsBulkAPImport(requestData : any): Observable<any>{
        return this.http.post(baseURL + '/bulkapupload', requestData, this.getTokenPlane()).map(function(res){
            console.log(res);
            let data = new ResponseData(res['success'], res['message']?res['message']:null);
            console.log(data);
            return data;
        }).catch(this.handleLoginError);
    }

    cdsImportAPsInCluster(clustername : string):Observable<any>{
        let data = {'clustername':clustername};
        return this.http.post(baseURL + '/importclusteraps', data, this.getToken()).map(function(res){
            console.log(res);
            /*let data = new ResponseData(res['success'], res['message']?res['message']:null);
            console.log("data : "+data);*/
            return res;
        }).catch(this.handleLoginError);
    }

    cdsTestConnectionService(ip:string, loginid:string, password:string) : Observable<Object>{
        let data = {
            ip : ip,
            loginid : loginid,
            password : password
        };
        const params = new URLSearchParams();
        for(let key in data){
            params.set(key, data[key]) ;
        }
        return this.http.post(baseURL + '/testconnection', (data) , this.getToken()).map(function(res){
            //console.log(res);
            //let data = new ResponseData(res['success'], res['message']);
             //console.log("data : "+data);
             return res;
         }).catch(this.handleLoginError);
    }

    updateAdminDiscovery(adminDtl: AdminResponse, paramObj){
        const header = this.getToken();
        const userAdminDetails = adminDtl.data;
        const data = {
            username: userAdminDetails.username,
            password: userAdminDetails.password,
            email: userAdminDetails.email,
            allowunregisteredap : paramObj.allowUnregisteredAp,
            defaultcluster: paramObj.selectedAdminCluster,
        };
        console.log(data);
        
        return this.http.put(baseURL + '/users/admin', (data), header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
        
    }

    updateAdminTimeZone(adminDtl: AdminResponse, paramObj){
        const header = this.getToken();
        const userAdminDetails = adminDtl.data;
        const data = {
            username: userAdminDetails.username,
            password: userAdminDetails.password,
            email: userAdminDetails.email,
            timezone: paramObj.timeZone,
        };
        console.log(data);
        
        return this.http.put(baseURL + '/users/admin', (data), header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
        
    }

    updateAdminPassword(adminDtl: AdminResponse, paramObj){
        const header = this.getToken();
        const userAdminDetails = adminDtl.data;
        const data = {
            username: userAdminDetails.username,
            password: paramObj.password,
            email: userAdminDetails.email,
            timezone: userAdminDetails.timezones,
        };
        console.log(data);
        
        return this.http.put(baseURL + '/users/admin', (data), header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);    
    }

    getUserAdminDetail() : Observable<any>{
        const header = this.getToken();
        if(this._cookieService.get('TOKEN')==undefined || this._cookieService.get('TOKEN')==null) {
            return new Observable(data=>{
                data.next('No token');
            });
        } else {
            return this.http.get(baseURL + '/users/admin', header).map(function(res){
                // console.log(res);
                return res;
            }).catch(this.handleLoginError);    
        }
        
    }

    getToken(){
        const newHttpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/json',
                'x-access-token' : this._cookieService.get('TOKEN') })
        };
        return newHttpOptions;
    }

    postFile(fileToUpload: File): Observable<boolean> {
        const url = '/api/upload';
        const newHttpOptions = { headers: new HttpHeaders({ 'x-access-token' : this._cookieService.get('TOKEN') })};
        const fd: FormData = new FormData();
        fd.append('file', fileToUpload, fileToUpload.name);
        return this.http.post(url, fd, newHttpOptions).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    cdsEditClusterService(data:any):Observable<any>{
        const header = this.getToken();
        let ip = data.previousIP;
        return this.http.put(baseURL+'/controllers/'+ip,(data), header).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }

    updateBackupSettings(paramObj){
        const header = this.getToken();

        return this.http.put(baseURL + '/editbackupsettings/admin', (paramObj), header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);    
    }

    getbackupHistory() : Observable<any>{
        const header = this.getToken();
        
        return this.http.get(baseURL + '/backuphistory', header).map(function(res){
            //console.log("BAckUP HISTory",res);
            return res;
        }).catch(this.handleLoginError);
    }

    getConfigBackupFileInfo(fileId){
        const header = this.getToken();
        return this.http.get(baseURL + '/download/'+fileId, header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    manualConfigBackup(clusterIp){
        const header = this.getToken();
        return this.http.post(baseURL + '/manualconfigbackup/'+clusterIp, {}, header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    checkbackupfilestatus(fileId, clusterIP){
        const header = this.getToken();
        return this.http.get(baseURL + '/checkbackupfilestatus/'+fileId+'/'+clusterIP, header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    cdsBackupLogsService(obj) : Observable<any> {
        const str = 'token='+this._cookieService.get('TOKEN')+'&ipaddress='+obj.ip+'&startdatetime='+obj.startdatetime+'&enddatetime='+obj.enddatetime;

        return this.http.post(baseURL + '/configbackupdiff?'+str ,this.getToken()).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    getTokenPlane(){
        const newHttpOptions = {
            headers: new HttpHeaders({
                'x-access-token' : this._cookieService.get('TOKEN') })
        };
        return newHttpOptions;
    }

    getCDSVersion() : Observable<any>{
        const header = this.getToken();
        
        return this.http.get(baseURL + '/appversion', header).map(function(res){
            //console.log("App Version",res);
            return res;
        }).catch(this.handleLoginError);
    }

    createAPIkey(obj){
        const header = this.getToken();
        let data = {
            status : obj.status,
            description : obj.description
        }
        return this.http.post(baseURL + '/createapikey/',(data), header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    listAPIKeys() : Observable<any>{
        const header = this.getToken();
        
        return this.http.get(baseURL + '/apikeyslist', header).map(function(res){
            //console.log("Apikeys",res);
            return res;
        }).catch(this.handleLoginError);
    }

    deleteAPIKey(apikey:string) : Observable<any>{
        const header = this.getToken();
        return this.http.delete(baseURL + '/deleteapikey/'+ apikey, header).map(function(res){
            console.log("Api delete",res);
            return res;
        }).catch(this.handleLoginError);
    }

    bulkAPIKeyDelete(apiKeyList:string) : Observable<any>{
        return this.http.delete(baseURL + '/bulkdeleteapikey/' + apiKeyList, this.getToken()).map(function(res){
            let data = new ResponseData(res['success'], res['message']);
            console.log("bulk api delete response",data);
            return data;
        }).catch(this.handleLoginError);
    }

    bulkAPIStatusUpdate(apiKeyList:string , apiKeyStatus:string) : Observable<any>{
        return this.http.put(baseURL + '/bulkupdateapikey/' + apiKeyList + '/' + apiKeyStatus,{},this.getToken()).map(function(res){
            let data = new ResponseData(res['success'], res['message']);
            console.log("bulk api update status response",data);
            return data;
        }).catch(this.handleLoginError);
    }

    getUserList() : Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL+'/users', header).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }

    addNewUser(data) : Observable<any>{
        const header = this.getToken();
        return this.http.post(baseURL+'/users', data,header).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }

    editUser(obj) : Observable<any>{
        const header = this.getToken();
        let data = {
            username : obj.username,
            password : obj.password,
            email : obj.email,
            timezones : obj.timezones
        }
        console.log("data for edit user-->",data.username);
        return this.http.put(baseURL+'/edituser/' + data.username,(data),header).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }

    deleteUser(data) : Observable<any>{
        const header = this.getToken();
        return this.http.delete(baseURL+'/users/'+data,header).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }

    uploadbackuptocontroller(fileId : string):Observable<any>{
        return this.http.post(baseURL + '/uploadbackuptocontroller/'+fileId, {}, this.getToken()).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }	

    triggerrestoreoncontroller(controllerId : string, backupkey : string):Observable<any>{
        let data = {'controllerId':controllerId, 'backupKeyOnController' : backupkey};
        return this.http.post(baseURL + '/triggerrestoreoncontroller', data, this.getToken()).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }
    
    getConfigbackupFiles(ip) : Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL + '/clusterbackuphistory/' + ip, header).map(function(res){
            //console.log("BAckUP Files",res);
            return res;
        }).catch(this.handleLoginError);
    }

    getUnmanagedAPCount():Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL + '/unmanagedaps' , header).map(function(res){
            //console.log("BAckUP Files",res);
            return res;
        }).catch(this.handleLoginError);   
    }

    cdsCheckAPUploadStatus():Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL + '/bulkapuploadtaskstatus' , header).map(function(res){
            // console.log("Bulk upload ap : ",res);
            return res;
        }).catch(this.handleLoginError);       
    }
    deleteConfigBackupFile(configId) : Observable<any>{
        const header = this.getToken();
        return this.http.delete(baseURL+'/deletebackuphistory/'+configId,header).map(function(res){
            return res;
        }).catch(this.handleLoginError);
    }
	resolvednsname(hostname):Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL + '/dnsresolve/'+hostname , header).map(function(res){
            return res;
        }).catch(this.handleLoginError);       
    }
    backProcessSchedulerService(adminDtl: AdminResponse, paramObj): Observable < any > {
         const header = this.getToken();
         let userName = adminDtl.data.username;
         console.log("userName",userName);
         return this.http.put(baseURL + '/backprocessscheduler/'+userName, paramObj, header).map(function(res) {
             //console.log(res);
             return res;
         }).catch(this.handleLoginError);
    }
    listAppLogs():Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL + '/applicationlogs', header).map(function(res){
            return res;
        }).catch(this.handleLoginError);       
    }
    appLogsSettingsService(adminDtl: AdminResponse, paramObj): Observable < any > {
         const header = this.getToken();
         let userName = adminDtl.data.username;
         console.log("userName",userName);
         return this.http.put(baseURL + '/logsconfigurations/'+userName, paramObj, header).map(function(res) {
             //console.log(res);
             return res;
         }).catch(this.handleLoginError);
    }
    appLogsDownloadFileService(filename):Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL + '/applicationlogs/download/'+filename, header).map(function(res){
            return res;
        }).catch(this.handleLoginError);       
    }
    appLogsDownloadAllFileService(type):Observable<any>{
        const header = this.getToken();
        return this.http.get(baseURL + '/applicationlogs/downloadallfiles/'+type, header).map(function(res){
            return res;
        }).catch(this.handleLoginError);       
    }

    getExportDBConfig(){
        const header = this.getToken();
        return this.http.get(baseURL + '/dbconfigexport/', header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    downloadExportDBConfig(){
        const header = this.getToken();
        return this.http.get(baseURL + '/downloaddbconfig/', header).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }

    uploadDbConfig(fileToUpload: File): Observable<boolean> {
        const url = baseURL + '/dbconfigimport';
        const newHttpOptions = { headers: new HttpHeaders({ 'x-access-token' : this._cookieService.get('TOKEN') })};
        const fd: FormData = new FormData();
        fd.append('file', fileToUpload, fileToUpload.name);
        return this.http.post(url, fd, newHttpOptions).map(function(res){
            console.log(res);
            return res;
        }).catch(this.handleLoginError);
    }
}
