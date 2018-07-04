import { Component, OnInit } from '@angular/core';
import { CDSService } from '../../../services/httpAPI.service';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ResponseData, ErrorResponse } from '../../../models/response';
import { SharedService } from '../../../services/shared.service';
import { UserTableData } from '../../../models/user';

@Component({
	selector: 'app-add-user',
	templateUrl: './add-user.component.html',
	styleUrls: ['./add-user.component.css']
})
export class AddUserComponent implements OnInit {

	loaderDisplay : string = 'none';
	addUserForm:FormGroup;
	username:FormControl;
	email:FormControl;
	password:FormControl;
	timezones:FormControl;
	response:ResponseData;
	errorResponse:ErrorResponse;
	userList: UserTableData[]=[];
	user:any={
		refresh:false,
		userList:this.userList,
		action:''
	};
	modelTitle : string = '';
	message : string = '';
	
	constructor(fb: FormBuilder, private apiData: CDSService, private sharedService:SharedService) {
		this.addUserForm = fb.group({
			username: [],
			email: [],
			password: [],
			timezones: []
		});
		this.addUserForm.reset();
	}

	ngOnInit() {
		let view = this;
		view.username = new FormControl('', [Validators.required]);
		view.email = new FormControl('',[Validators.required, Validators.email]);
		view.password = new FormControl('',[Validators.required]);
		view.timezones = new FormControl();

		view.addUserForm = new FormGroup({
			username: view.username,
			email: view.email,
			password: view.password,
			timezones: view.timezones,
		});
		view.addUserForm.controls['timezones'].setValue('');
	}

	addUserDetails(){
		let view=this;
		view.loaderDisplay = 'none';
		let data = {
			username:'',
			password:'',
			email:'',
			timezones:''
		};

		if (view.addUserForm.valid) {
			console.log('Form valid? ' + view.addUserForm.valid);
			data.username = view.addUserForm.controls['username'].value;
			data.password = view.addUserForm.controls['password'].value;
			data.email = view.addUserForm.controls['email'].value;
			if (view.addUserForm.controls['timezones'].value != '') {
				data.timezones = view.addUserForm.controls['timezones'].value;
			}
			view.apiData.addNewUser(data).subscribe(function(val){
				view.loaderDisplay = 'block';
				console.log(val);
				view.response = val;
				if (view.response.success) {
					view.modelTitle = 'Success';
					view.message = val.message;
					$("#addUserModal .close").click();
					view.user.refresh = true;
					view.user.action='refresh';
					view.sharedService.userDataTransfer(view.user);
					view.cancelAddUserDetails();
				} else {
					view.modelTitle = 'Error';
					view.message = val.message;
				}
				view.loaderDisplay = 'none';
				//$('#modelAlertUser').modal('show');
			},function(err){
				view.errorResponse = err;
					$('.modal-backdrop').hide();
				if (view.errorResponse.message.includes('Session')) {
					view.sharedService.logout(true);
				} else {
					view.modelTitle = view.errorResponse.title;
					view.message = view.errorResponse.message;
					$('#modelAlertUser').modal('show');
				}
			});
		}else if(!view.addUserForm.controls['username'].value) {
			view.modelTitle = 'Error';
			view.message = 'Please Enter Username';
		}
		else if(!view.addUserForm.controls['password'].value) {
			view.modelTitle = 'Error';
			view.message = 'Please Enter Password';
		}
		else if(!view.addUserForm.controls['email'].value) {
			view.modelTitle = 'Error';
			view.message = 'Please Enter Email';
		}
		$('#modelAlertUser').modal('show');

	}

	cancelAddUserDetails(){
		this.addUserForm.reset();
		this.addUserForm.controls['timezones'].setValue('');
		$('#addUserModal .close').click();
	}

	onOk(){
		$('#modelAlertUser .close').click();
	}
}
