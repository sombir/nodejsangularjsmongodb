import { Component, OnInit, ViewChild } from '@angular/core';
import { CDSService } from '../../services/httpAPI.service';
import { DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs/Subject';
import { ResponseData, ErrorResponse } from '../../models/response';
import { SharedService } from '../../services/shared.service';
import { UserListResponse, UserTableData } from '../../models/user';
@Component({
	selector: 'app-userlist',
	templateUrl: './userlist.component.html',
	styleUrls: ['./userlist.component.css']
})
export class UserlistComponent implements OnInit {
	@ViewChild(DataTableDirective) 
	dataTableElement: DataTableDirective = null;
	dtOptions: any = {};
	dt:any;
	dtTrigger: Subject<any> = new Subject();
	getUserResponse: UserListResponse;
	userList:UserTableData[] = [];
	displayAddUser : string = 'none';
	displayEditUser : string = 'none';
	displayDeleteUser : string = 'none';
	selectedAll:boolean=false;
	selectedUserList:UserTableData[]=[];
	sharedUserList: UserTableData[]=[];
	errorResponse:ErrorResponse;
	userTitle:string='';
	userMessage:string='';
	tableLength:number=0;
	user:any={
		refresh:false,
		userList:this.sharedUserList,
		action:''
	};
	btnEnabled:boolean = true;

	constructor(private apiData: CDSService, private sharedService:SharedService) { }

	ngOnInit() {
		let view = this;
		$('body').css('background-color', '#D9E0E7');
		view.sharedService.userRefresh.subscribe(function(val){
			console.log('user refreshed : ' + val);
			if (val) {
				view.refreshUserList();	
			}
		});
		view.getUserTableData();
	}

	getUserTableData(){
		let view = this;

		view.dtOptions = {
			pagingType: 'full_numbers',
			pageLength: 10,
			dom: "Z<'row'<'col-6'i><'col-6'f>>" +
			"<'row'<'col-12'tr>>" +
			"<'row'<'col-8'l><'col-4'p>>",
			columnDefs: [ { orderable: false, targets: [0] } ],
			language: {
				emptyTable : "No data available in table",
				info: "_START_ - _END_ of _TOTAL_",
				infoEmpty: "0 - 0 of 0",
				lengthMenu:     "Show _MENU_",
				zeroRecords:"",
				searchPlaceholder: "Search User"
			}
		};
		view.apiData.getUserList().subscribe(function(val){
			console.log(val);
			view.getUserResponse = val;
			if (view.getUserResponse.totalCount) {
				view.userList = view.getUserResponse.list;
				for (let i = 0; i < view.userList.length; i++) {
					view.getUserResponse.list[i].timeZoneVal = '';
					if(view.userList[i].timezones == "UTC-09:00"){
						view.userList[i].timeZoneVal = "Hawaii–Aleutian Time Zone";
					}
					if(view.userList[i].timezones == "UTC-08:00"){
						view.userList[i].timeZoneVal = "Alaska Time Zone";
					}
					if(view.userList[i].timezones == "UTC-07:00"){
						view.userList[i].timeZoneVal = "Pacific Time Zone";
					}
					if(view.userList[i].timezones == "UTC-06:00"){
						view.userList[i].timeZoneVal = "Mountain Time Zone";
					}
					if(view.userList[i].timezones == "UTC-05:00"){
						view.userList[i].timeZoneVal = "Central Time Zone";
					}
					if(view.userList[i].timezones == "UTC-04:00"){
						view.userList[i].timeZoneVal = "Eastern Time Zone";
					}
				}
				view.dtTrigger.next();
				view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
					view.dt=dtInstance;
				});
				setTimeout(()=> {
					view.dt.on( 'draw.dt', function () {
						let checkedCount=0;
						let uncheckedCount=0;
						console.log('searched ' + view.dt.search());
						let numberofrows = $('#userTable tbody tr').length;
						console.log('number of rows ' +  numberofrows);
						for (let i=1; i < (numberofrows+1); i++) {
							let isChecked = $('table tbody tr:nth-child('+i+') td:nth-child(1) input:checkbox').is( ":checked" );
							if(isChecked) {
								checkedCount+=1;
							} else {
								uncheckedCount+=1;
							}
							if(i==(numberofrows)) {
								if(uncheckedCount>0) {
									$('#selectAllCheck').prop('checked', false); 
								} else {
									$('#selectAllCheck').prop('checked', true);  
									let event = {target:{checked:true}};
									view.checkAllRows(event);           
								}
							}
						}

					});
				}, 1000);
				$(".sorting_disabled").css('background-image', 'none');
				$('table.dataTable thead tr.cancel_sorting th:first-child').removeClass('sorting_asc');
				$('table.dataTable thead tr.cancel_sorting th:first-child').addClass('sorting_disabled');
			} else {

			}
		},function(err){
			console.log(err);
			view.errorResponse = err;
			if (view.errorResponse.message.includes('Session')) {
				view.sharedService.logout(true);
			} else {
				view.showAlert(view.errorResponse.title, view.errorResponse.message);
			}
		});

	}

	refreshUserList(){
		let view = this;
		view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
			dtInstance.destroy();
			view.getUserTableData();
			this.btnEnabled = true;
		});
		view.selectedUserList=[];
	}

	addUserBtn(){
		this.displayAddUser='block';
	}

	editUserBtn(){
		this.displayEditUser='block';
		this.user.action='editUser';
		this.sharedService.userDataTransfer(this.user);

	}

	deleteUserBtn(){
		this.displayDeleteUser='block';
		this.user.action='deleteUser';
		console.log(this.user);
		this.sharedService.userDataTransfer(this.user);
	}

	checkAllRows(event:any){
		let view=this;
		view.selectedUserList=[];
		view.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
			view.tableLength=(dtInstance.page.info().length>=view.userList.length)?view.userList.length:dtInstance.page.info().length;
			for (let i = 0; i < (view.tableLength+1); i++) {
				let username=$('table tbody tr:nth-child('+i+') td:nth-child(2)').text();
				let index= view.userList.indexOf(view.userList.find(function(obj) : boolean {
					return obj.username==username;
				}));
				
				if((username!=undefined) && (username!=null) && (username!='')){
					view.userList[index].selectcheckbox = event.target.checked;
					view.checkSelectedRows(view.userList[index], event.target.checked);
				}
			}
		});
/*
		for(let i=0;i<view.userList.length;i++){
			view.userList[i].selectcheckbox = event.target.checked;
			view.checkSelectedRows(view.userList[i],event.target.checked);
		}*/
	}

	checkSelectedRows(user:UserTableData,isChecked : any){
		console.log(user);
		console.log(this.userList);
		let index = this.selectedUserList.indexOf(this.selectedUserList.find(function(obj) : boolean{
			return obj.username == user.username;
		}));
		console.log(index);
		if (isChecked) {
			for (let i = 0; i < this.userList.length; ++i) {
				if (this.userList[i].username == user.username) {
					if (index == -1 ) {
						this.selectedUserList.push(user);
					}
					console.log(this.selectedUserList);
				}
				if(this.selectedUserList.length >= 1)
					this.btnEnabled = false;
				else
					this.btnEnabled = true;
			}
		} else{

			this.selectedUserList.splice(index,1);
			if(this.selectedUserList.length >= 1)
				this.btnEnabled = false;
			else
				this.btnEnabled = true;
			console.log(this.selectedUserList);
			this.selectedAll = false;
		}

		if (this.selectedUserList.length > 0) {
			this.user.refresh=false;
			this.user.userList=this.selectedUserList
		}

		if(($('#userTable tr').length-1) == this.selectedUserList.length) {
			this.selectedAll=true;
		} else {
			this.selectedAll=false;
		} 
		
		if (this.selectedUserList.length == this.userList.length) {
			this.selectedAll = this.userList.every(function(item:any) {
				return item.selectcheckbox == true;
			});
		}
	}

	showAlert(title:string,message:string){
		this.userMessage=message;
		this.userTitle=title;
		$('#openUserpopup').click();
	}

	okUserBtnClicked(){
		$('#confirmUserModal .close').click();
	}

}
