export class ZonesData {
  constructor(public id : string,
    public name : string) {
    // code...
  }
}

export class ControllerIPData{
  constructor(public ip : string) {
    // code...
  }
}
export class ManagementIPData{
  constructor(public ip : string) {
    // code...
  }
}

export class dplistItem{
  constructor(public mac:string,
    public model:string,
    public serialNumber : string,
    public version:string,
    public name:string,
    public cpId: any,
    public cpName:string,
    public ip:string,
    public status: string,
    public uptimeInSecs:number){}
}

export class cplistItem {
  
  constructor(public cpId:string,
    public model:string,
    public mac:string,
    public serialNumber : string,
    public version:string,
    public name:string,
    public status: string,
    public role:string,
    public uptimeInSecs:number,
    public managementIp:string,
    public diskTotal: number,
    public diskUsed:number
    ) {
    // code...
  }
}

export class apmodelsummaryItem {
  
  constructor(public clusterId:string,
    public domainId:string,
    public domainName:string,
    public zoneId:string,
    public zoneName:string,
    public apModel:string,
    public apOnline:number,
    public apOffline:number,
    public apFlagged:number) {
    // code...
  }
}

export class ostypesummaryItem {
  
  constructor(public clusterId:string,
    public domainId:string,
    public domainName:string,
    public zoneId:string,
    public zoneName:string,
    public osType:string,
    public count:number) {
    // code...
  }
}

export class zonesummaryItem {
  
  constructor(public clusterId:string,
    public domainId:string,
    public domainName:string,
    public zoneId:string,
    public zoneName:string,
    public client:number,
    public apOnline:number,
    public apOffline:number,
    public apFlagged:number) {
    // code...
  }
}

export class zoneInventory {
  
  constructor(public zonesummary : zonesummaryItem[],
    public ostypesummary: ostypesummaryItem[],
    public apmodelsummary: apmodelsummaryItem[]) {
    // code...
  }
}

export class systemSummary {
  
  constructor(public version:string,
    public model:string,
    public clusterName:string,
    public clusterState:string,
    public apLicenseTotal:number,
    public apLicenseConsumed:number
    ) {
    // code...
  }
}

export class stats {
  
  constructor(public systemsummary : systemSummary,
    public zoneinventory : zoneInventory,
    public cplist: cplistItem[],
    public dplist: dplistItem[]) {
    // code...
  }
}



export class ClusterData {
  constructor(public _id: string,
    public ip : string,
    public apsimported : boolean,
    public name : string,
    public loginid : string,
    public password : string,
    public tag : string,
    public username : string,
    public __v : number,
    public last_modified : string,
    public lastsynchtime: string,
    public stats : stats,
    public status : number,
    public defaultcluster : boolean,
    public numberofaps : number,
    public select : boolean = false,
    public zones : ZonesData[],
    public controllerip : ControllerIPData[],
    public Menagemenrips : ManagementIPData[]
    ) {
    // code...
  }
}

export class ClusterListData{
  constructor(public totalCount : number,
    public hasmore : boolean,
    public list : ClusterData[]) {
    // code...
  }
}

export class ClusterTableData {
  
  constructor(public name : string,
    public ip: string,
    public defaultcluster:boolean,
    public status : number,
    public numberofaps : number,
    public version : string,
    public connectionStatus: number,
    public onlineAP : number,
    public offlineAP : number,
    public flaggedAP: number,
    public onlineCP: number,
    public offlineCP : number,
    public flaggedCP: number,
    public onlineDP: number,
    public offlineDP: number,
    public flaggedDP: number,
    public select : boolean,
    public APLicenseUsed: any,
    public loginid:string,
    public password:string,
    public tag:string,
    public apsimported:boolean) {
    // code...
  }
}