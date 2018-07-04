import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Routes, RouterModule, Router} from "@angular/router";
import { AddClusterComponent } from './Cluster/addCluster/addCluster.component';
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './pagenotfound/pagenotfound.component';
import { ClusterComponent } from './Cluster/cluster.component';
import { ClusterListComponent } from './Cluster/ClusterList/clusterList.component';
import { DashboardComponent } from './dashboard/dashboard.component' ;
import { HomeComponent } from './home/home.component' ;
import { AccesspointComponent } from './accesspoint/accesspoint.component' ;
import { InventoryComponent } from './inventory/inventory.component';
import { InventoryListComponent } from './inventory-list/inventory-list.component';
import { AdminComponent } from './admin/admin.component';
import { ClusterDetailComponent } from './cluster-detail/cluster-detail.component';
import { ConfigBackupsComponent } from './config-backups/config-backups.component';
import { ApiKeyComponent } from './api-key/api-key.component';
import { AdminactivitiesComponent } from './adminactivities/adminactivities.component';
import { UserlistComponent } from './userlist/userlist.component';
import { ApplicationLogsComponent } from './application-logs/application-logs.component';

const routes: Routes = [
{ 
	path: '',
	redirectTo: '/login',
	pathMatch: 'full'
},
{
	path: 'login',
	component: LoginComponent
},
{
	path : 'dashboard',
	component : DashboardComponent,
	children: [
	{
		path: '',
		redirectTo: 'home', 
		pathMatch: 'full'
	},
	{
		path: 'inventory', 
		component: InventoryComponent/*,
		children: [
		{
			path: '',
			redirectTo: 'cluster', 
			pathMatch: 'full'
		},
		{
			path : 'cluster',
			component : ClusterComponent
		},
		{
			path : 'accesspoints', 
			component:  InventoryListComponent
		},
		{
			path : 'inventory',
			component : AccesspointComponent
		}
		]*/
	},
	{
		path: 'clusterDetail/:clusterIP',
		component: ClusterDetailComponent
	},
	{
		path : 'admin',
		component : AdminComponent
	},
	{
		path: 'home', 
		component: HomeComponent
	},
	{
		path: 'configBackups', 
		component: ConfigBackupsComponent
	},
	{
		path: 'apiKey', 
		component: ApiKeyComponent
	},
	{
		path: 'adminActivities', 
		component: AdminactivitiesComponent
	},
	{
		path: 'userList', 
		component: UserlistComponent
	},
	{
		path: 'applicationLogs', 
		component: ApplicationLogsComponent
	}
	]
},
{ 
	path: '**', 
	component: PageNotFoundComponent 
}
];
@NgModule({
	imports: [ 
	RouterModule.forRoot(routes),
	CommonModule
	],
	exports: [ RouterModule ]
})
export class AppRoutingModule { 
}