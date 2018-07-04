export class AdminResponse {
    constructor(
        public data : adminData,
        public success : boolean
		) {
	}
}

export class adminData{
    constructor(
        public active: number,
        public allowunregisteredap:boolean,
        public date_updated:string,
        public email:string,
        public lastlogin:string,
        public password:string,
        public timezones:string,
        public username:string,
        public _id:string,
        public backprocesssettings:object,
        public logsconfig:object
    ){}
}