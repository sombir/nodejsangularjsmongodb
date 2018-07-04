export class ResponseData {
    constructor(public success: boolean,
        public message: any) {
        // code...
    }
}

export class LoginData {

    constructor(public success: boolean,
        public message: string,
        public token: string) {
        // code...
    }
}

export class ConfigBackupResponse {
	constructor(public success:boolean, public backupId:string, public message:string){

	}
}

export class CheckbackupfilestatusResponse {
	constructor(public success:boolean, public download:boolean, public message:string){
		
	}
}

export class HandleErrorResponse{
    constructor(public headers:{normalizedNames:Object,lazyUpdate:Object},
        public status:number,
        public statusText:string,
        public url:string,
        public ok:boolean,
        public name:string,
        public message:string,
        public error:{success:boolean,message:string}){
        let obj={normalizedNames:{},
                lazyUpdate:{}};
        this.headers=obj;
        this.status=0,
        this.statusText='';
        this.url='';
        this.ok=false;
        this.name='';
        this.message='';
        let err={success:false,message:''};
        this.error=err;
    }
}

export class ErrorResponse{
    constructor(public title:string,public message:string){
        this.title='';
        this.message='';
    }
}

export class BackupResponseData {
    constructor(public success: boolean,
        public data:any,
        public message: any) {
        // code...
    }




}