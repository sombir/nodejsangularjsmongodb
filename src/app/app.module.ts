import { NgModule,  CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { CookieService } from 'angular2-cookie/services/cookies.service';
import { DataTablesModule } from 'angular-datatables';
import { TreeModule } from 'angular-tree-component';
import { StorageServiceModule} from 'angular-webstorage-service';

import {Routes, RouterModule, Router} from "@angular/router";
import { CDSService } from '../services/httpAPI.service';
import { SharedService } from '../services/shared.service';

import { AppComponent } from './app.component';
import { LoginComponent} from './login/login.component';
import { AddClusterComponent } from './Cluster/addCluster/addCluster.component';
import { PageNotFoundComponent } from './pagenotfound/pagenotfound.component';
import { ClusterComponent } from './Cluster/cluster.component';
import { ClusterListComponent } from './Cluster/ClusterList/clusterList.component';
import { DashboardComponent } from './dashboard/dashboard.component' ;
import { HomeComponent } from './home/home.component' ;
import { DeleteClusterComponent } from './Cluster/deleteCluster/deleteCluster.component';
import { AccesspointComponent } from './accesspoint/accesspoint.component';
import { AddaccesspointComponent } from './accesspoint/addaccesspoint/addaccesspoint.component' ;

import * as bootstrap from "bootstrap";
import { MoveaccesspointComponent } from './accesspoint/moveaccesspoint/moveaccesspoint.component';
import { InventoryComponent } from './inventory/inventory.component';
import { InventoryListComponent } from './inventory-list/inventory-list.component';
import { AdminComponent } from './admin/admin.component';
import { ClusterDetailComponent } from './cluster-detail/cluster-detail.component';
import { ManagedApComponent } from './inventory-list/managed-ap/managed-ap.component';
import { ImportApComponent } from './Cluster/import-ap/import-ap.component';
import {HashLocationStrategy, Location, LocationStrategy} from '@angular/common';
import { ShowConfirmationAlertComponent } from './show-confirmation-alert/show-confirmation-alert.component';
import { EditClusterComponent } from './Cluster/edit-cluster/edit-cluster.component';
import { ConfigBackupsComponent } from './config-backups/config-backups.component';
import { ApiKeyComponent } from './api-key/api-key.component';
import { AdminactivitiesComponent } from './adminactivities/adminactivities.component';
import { ActivitiestableComponent } from './adminactivities/activitiestable/activitiestable.component';
import { BackupTableComponent } from './cluster-detail/backup-table/backup-table.component';
import * as moment from 'moment';
import { UserlistComponent } from './userlist/userlist.component';
import { AddUserComponent } from './userlist/add-user/add-user.component';
import { EditUserComponent } from './userlist/edit-user/edit-user.component';
import { DeleteUserComponent } from './userlist/delete-user/delete-user.component';
import { ApplicationLogsComponent } from './application-logs/application-logs.component';

@NgModule({
  declarations: [
  AppComponent,
  LoginComponent,
  AddClusterComponent,
  PageNotFoundComponent,
  ClusterComponent,
  ClusterListComponent,
  DashboardComponent,
  HomeComponent,
  DeleteClusterComponent,
  AccesspointComponent,
  AddaccesspointComponent,
  MoveaccesspointComponent,
  InventoryComponent,
  InventoryListComponent,
  AdminComponent,
  ClusterDetailComponent,
  ManagedApComponent,
  ImportApComponent,
  ShowConfirmationAlertComponent,
  EditClusterComponent,
  ConfigBackupsComponent,
  ApiKeyComponent,
  AdminactivitiesComponent,
  ActivitiestableComponent,
  BackupTableComponent,
  UserlistComponent,
  AddUserComponent,
  EditUserComponent,
  DeleteUserComponent,
  ApplicationLogsComponent
  ],
  imports: [
  BrowserModule,
  FormsModule,
  HttpClientModule,
  AppRoutingModule,
  ReactiveFormsModule,
  DataTablesModule,
  BrowserAnimationsModule,
  TreeModule,
  StorageServiceModule,
  ],
  exports: [ RouterModule ],
  providers: [CDSService, CookieService, SharedService],
  bootstrap: [AppComponent],
  schemas : [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  entryComponents: [AddClusterComponent, ManagedApComponent, ShowConfirmationAlertComponent, ActivitiestableComponent, BackupTableComponent]
})
export class AppModule { }
