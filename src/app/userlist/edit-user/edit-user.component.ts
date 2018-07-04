import { Component, OnInit } from '@angular/core';
import { CDSService } from '../../../services/httpAPI.service';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { SharedService } from '../../../services/shared.service';
import { UserTableData } from '../../../models/user';
import { ResponseData, ErrorResponse } from '../../../models/response';

@Component({
	selector: 'app-edit-user',
	templateUrl: './edit-user.component.html',
	styleUrls: ['./edit-user.component.css']
})
export class EditUserComponent implements OnInit {

	loaderDisplay : string = 'none';
	editUserForm:FormGroup;
	username:FormControl;
	email:FormControl;
	password:FormControl;
	timezones:FormControl;
	userList:UserTableData[]=[];
	response:ResponseData;
	errorResponse:ErrorResponse;
	oneUserSelected:boolean=false;
	wrongNoofUserSelected:boolean=false;
	user:any={
		refresh:false,
		userList:this.userList,
		action:''
	};
	modalTitle : string = '';
	message : string = '';
	constructor(fb: FormBuilder, private apiData: CDSService, private sharedService:SharedService) { 
		this.editUserForm = fb.group({
			username:[],
			email: [],
			password: [],
			timezones: []
		});
	}

	ngOnInit() {
		let view = this;
		view.sharedService.editUserList.subscribe(function(val){
			console.log(val);
			view.userList=val;
			view.validateUserList();
		});

	}

	validateUserList(){
		let view=this;
		if (view.userList.length == 1) {
			view.username = new FormControl({value:view.userList[0].username, disabled:true},[Validators.required]);
			view.email = new FormControl({value:view.userList[0].email, disabled:false},[Validators.required, Validators.email]);
			view.password = new FormControl('',[Validators.required]);
			view.timezones = new FormControl();

			view.editUserForm = new FormGroup({
				username:view.username,
				email: view.email,
				password: view.password,
				timezones: view.timezones,
			});
			if (view.userList[0].timezones!='') {
				view.editUserForm.controls['timezones'].setValue(view.userList[0].timezones);
			} else {
				view.editUserForm.controls['timezones'].setValue('');
			}

			view.oneUserSelected=true;
			view.wrongNoofUserSelected=false;
		} else if ((view.userList.length==0) || view.userList.length>1) {
			view.oneUserSelected=false;
			view.wrongNoofUserSelected=true;
		}
	}

	editUserDetails(){
		let view=this;
		let data = {
			username:'',
			password:'',
			email:'',
			timezones:''
		};
		
		if (view.editUserForm.valid) {
			console.log('Form valid? ' + view.editUserForm.valid);
			data.username=view.userList[0].username;
			data.email=view.editUserForm.controls['email'].value;
			data.password=view.editUserForm.controls['password'].value;
			if (view.editUserForm.controls['timezones'].value != '') {
				data.timezones = view.editUserForm.controls['timezones'].value;
			}
			view.apiData.editUser(data).subscribe(function(val){
				view.loaderDisplay = 'block';
				console.log(val);
				view.response = val;
				if (view.response.success) {
					view.modalTitle = 'Success';
					view.message = val.message;
					$("#editUserModal .close").click();
					view.user.refresh = true;
					view.user.action='refresh';
					view.sharedService.userDataTransfer(view.user);
					view.canceleditUserDetails();
				} else {
					view.modalTitle = 'Error';
					view.message = val.message;
				}
				view.loaderDisplay = 'none';
			},function(err){
				view.errorResponse = err;
					$('.modal-backdrop').hide();
				if (view.errorResponse.message.includes('Session')) {
					view.sharedService.logout(true);
				} else {
					view.modalTitle = view.errorResponse.title;
					view.message = view.errorResponse.message;
					$('#modalAlertUser').modal('show');
				}
			});
		} else if(!view.editUserForm.controls['username'].value) {
			view.modalTitle = 'Error';
			view.message = 'Please Enter Username';
		}
		else if(!view.editUserForm.controls['password'].value) {
			view.modalTitle = 'Error';
			view.message = 'Please Enter Password';
		}
		else if(!view.editUserForm.controls['email'].value) {
			view.modalTitle = 'Error';
			view.message = 'Please Enter Email';
		}
		$('#modalAlertUser').modal('show');

	}

	canceleditUserDetails(){
		$('#editUserModal .close').click();
		
	}
	
	onOk(){
		$('#modalAlertUser .close').click();
	}
}
