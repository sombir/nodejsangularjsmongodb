export class UserListResponse {
    constructor(public totalCount: number,
      public hasMore:boolean,
        public list: UserTableData[]) {
        // code...
    }
}

export class UserTableData {
  
  constructor(public active : number,
  	public allowunregisteredap : boolean,
  	public backupsettings:any,
  	public creationtime: string,
  	public date_updated: string,
  	public email : string,
  	public lastlogin: string,
  	public password: string,
  	public timezones:string,
  	public timeZoneVal:string,
  	public username:string,
    public role:string,
  	public __v: number,
  	public _id: string,
  	public selectcheckbox:boolean) {
    // code...
  }
}