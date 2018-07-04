export class ApDataArray {

	constructor(
		public _id: string,
		public apserial : string,
		public clusterid : string,
		public clustername : string,
		public mac : string,
		public ip : string,
		public apname : string,
		public zonename : string,
		public zoneid : string,        
		public connectionstate : string,
		public username : string,
		public selectcheckbox : boolean = false,
		public last_modified : string,
		public lastsynchtime : string
		) {      
	}
}

export class ApListResponse{
	constructor(
		public totalCount : number,
		public hasmore : boolean,
		public list : ApDataArray[]
		) {
	}
}


export class deleteApData {    
	constructor(public success : boolean, public message : string) {  }
}

export class BulkAPUploadData {
	
	constructor(public _id:string,
		public starttime : string,
		public action : string,
		public status : string,
		public description : string,
		public username : string,
		public _v:number) {
		// code...
	}
}

export class BulkAPUploadResponse {
	constructor(public success:boolean,
		public data : BulkAPUploadData,
		public message : string){}
}

/*"success": true,
    "data": {
        "_id": "5af5706d86d4cd8951db4f57",
        "starttime": "2018-05-11T10:29:01.887Z",
        "action": "bulkapupload",
        "status": "Running",
        "description": "CSV bulk APs Upload process started successfully",
        "username": "admin",
        "__v": 0
    },
    "message": "CSV bulk APs Upload process started successfully"*/