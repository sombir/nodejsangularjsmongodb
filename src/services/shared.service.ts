import { Injectable, EventEmitter } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ClusterData, ClusterListData } from '../models/cluster';
import { UserTableData } from '../models/user';

@Injectable()
export class SharedService {

	private refreshInventory = new BehaviorSubject(false);
  currentRefreshInventory = this.refreshInventory.asObservable();
  inventoryUpdated:EventEmitter<boolean> = new EventEmitter();
  import:EventEmitter<string> = new EventEmitter();
  refreshAP:EventEmitter<string> = new EventEmitter();
  cluster:EventEmitter<ClusterData>=new EventEmitter();
  clusterIP:EventEmitter<string>=new EventEmitter();
  isSessionExpired:EventEmitter<boolean> = new EventEmitter();
  clusterTableEntries:EventEmitter<number>=new EventEmitter();
  deleted:EventEmitter<boolean>=new EventEmitter();
  editUserList:EventEmitter<UserTableData[]>=new EventEmitter(); 
  deleteUserList:EventEmitter<UserTableData[]>=new EventEmitter(); 
  userRefresh:EventEmitter<boolean>=new EventEmitter();
  showText:EventEmitter<string>=new EventEmitter();
  apCount:EventEmitter<number>=new EventEmitter();
  bulkAPUploadErrorMessage:EventEmitter<string>=new EventEmitter();
  bulkAPUploadSuccessMessage:EventEmitter<string>=new EventEmitter();
  doRefreshCulter:EventEmitter<boolean>=new EventEmitter();
  doRefreshAPTree:EventEmitter<boolean>=new EventEmitter();
  doRefreshAPList:EventEmitter<boolean>=new EventEmitter();
  startUpload:EventEmitter<boolean>=new EventEmitter();
  clusterList:EventEmitter<ClusterListData>=new EventEmitter();
  onlineCluster:EventEmitter<string>=new EventEmitter();
  flaggedCluster:EventEmitter<string>=new EventEmitter();
  offlineCluster:EventEmitter<string>=new EventEmitter();
  onlineManagedAP:EventEmitter<string>=new EventEmitter();
  flaggedManagedAP:EventEmitter<string>=new EventEmitter();
  offlineManagedAP:EventEmitter<string>=new EventEmitter();
  unmanagedAP:EventEmitter<string>=new EventEmitter();
  doLoadAPList:EventEmitter<boolean>=new EventEmitter();
  doRefresh:EventEmitter<boolean>=new EventEmitter();

  constructor() { }

  refresh(message: boolean) {
    this.refreshInventory.next(message);
    this.inventoryUpdated.emit(message);

  }

  importAP(msg:string){
    this.import.emit(msg);

  }

  refreshAPTree(msg:string){
    this.refreshAP.emit(msg);
  } 	

  logout(isSessionExpired:boolean){
    this.isSessionExpired.emit(isSessionExpired);
  }

  editCluter(cluster:ClusterData){
    this.cluster.emit(cluster);
  }

  getClusterTableEntries(num:number){
    console.log(num);
    this.clusterTableEntries.emit(num);
  }

  isAllDeleted(deleted:boolean){
    console.log(deleted);
    this.deleted.emit(deleted);
  }

  userDataTransfer(user:any){
    if (user.action=='refresh') {
      this.userRefresh.emit(user.refresh);
    } else if (user.action=='editUser') {
      this.editUserList.emit(user.userList);
    } else if (user.action=='deleteUser') {
      this.deleteUserList.emit(user.userList);
    }
  }

  clusterZoneSelected(text:string){
    this.showText.emit(text);
  }

  getUnmanagedAPcount(count:number){
    this.apCount.emit(count);
  }

  bulkAPUploadError(msg:string){
    this.bulkAPUploadErrorMessage.emit(msg);
  }

  bulkAPUploadSuccess(msg:string){
    this.bulkAPUploadSuccessMessage.emit(msg);
  }

  dorefresfCluster(doRefresh:boolean){
    this.doRefreshCulter.emit(doRefresh);
  }

  dorefreshAPTree(doRefresh:boolean){
    this.doRefreshAPTree.emit(doRefresh);
  }

  dorefreshAPList(doRefresh:boolean){
    this.doRefreshAPList.emit(doRefresh);
  }

  startBulkAPUpload(startUpload:boolean){
    this.startUpload.emit(startUpload);
  }

  sendClusterList(clusterList:ClusterListData){
    this.clusterList.emit(clusterList);
  }

  showOnlineClusters(onlineCluster:string){
    this.onlineCluster.emit(onlineCluster);
  }

  showFlaggedClusters(flaggedCluster:string){
    this.flaggedCluster.emit(flaggedCluster);
  }

  showOfflineClusters(offlineCluster:string){
    this.offlineCluster.emit(offlineCluster);
  }

  showOnlineManagedAP(onlineManagedAP:string){
    this.onlineManagedAP.emit(onlineManagedAP);
  }

  showFlaggedManagedAP(flaggedManagedAP:string){
    this.flaggedManagedAP.emit(flaggedManagedAP);
  }

  showOfflineManagedAP(offlineManagedAP:string){
    this.offlineManagedAP.emit(offlineManagedAP);
  }

  showUnmanagedAP(unmanagedAP:string){
    this.unmanagedAP.emit(unmanagedAP);
  }

  goToAPList(doLoadAPList:boolean){
    this.doLoadAPList.emit(doLoadAPList);
  }

  refreshfilter(doRefresh:boolean){
    this.doRefresh.emit(doRefresh);
  }

}