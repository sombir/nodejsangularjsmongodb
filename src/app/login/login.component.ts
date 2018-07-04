import { Component, Output, EventEmitter, Input, OnInit, Pipe } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { CDSService } from '../../services/httpAPI.service';
import {CookieService} from 'angular2-cookie/core';
import 'rxjs/add/operator/catch';
import * as $ from 'jquery';
import { ResponseData, ErrorResponse } from '../../models/response';

class LoginData {
	
	constructor(public success: boolean,
		public message: string,
		public token: string) {
		// code...
	}
}


@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  username : FormControl;
  password : FormControl;
  response : LoginData;
  errorResponse : ErrorResponse;
  isHidden: boolean = false;
  notvalidate : boolean = true;
  userpwdmissing : boolean = true;
  otherErrorMessage:boolean=false;
  // router: Router;
  constructor(private router: Router, private loginData: CDSService, private _cookieService:CookieService){
  }

  title = 'app';

  ngOnInit(){
    this.username = new FormControl('', [Validators.required]);
    this.password = new FormControl('', [Validators.required]);
    this.loginForm = new FormGroup({
      username : this.username,
      password : this.password
    })

    if (this._cookieService.get('TOKEN') != null && this._cookieService.get('TOKEN') != undefined && this._cookieService.get('TOKEN') != '') {
      // code...
      this.router.navigate(['dashboard']);
      $('footer').css('background-color', 'white');
    } else{
      $('body').css('background-color', '#464C54');
      $('footer').css('background-color', '#464C54');

    }
  }

  loginClicked(){
  	let loading = true;
  	let view = this;
  	if (view.loginForm.valid) {
      this.loginData.cdsLoginService(view.loginForm.get('username').value,view.loginForm.get('password').value).subscribe(function(val) {
        this.response = val;
        // console.log(this.response.success);
        if (this.response.success) {
          $('body').css('background-color', '#D9E0E7');
          $('footer').css('background-color', 'white');
          
          view._cookieService.put('TOKEN', this.response.token);
          // console.log(view._cookieService.get('TOKEN'));
          view.isHidden =true;
          view.router.navigate(['dashboard']);
        } else {
          if (view.errorResponse.message.includes('user not found') || view.errorResponse.message.includes('Wrong password')) {
            view.userpwdmissing = true;
            view.notvalidate = false;
            view.otherErrorMessage=true;
          }
        }
      },function(err){
        if(!err.hasOwnProperty('error')) {
          view.errorResponse = err;
          $('#otherErrorMsg>label').text(view.errorResponse.message);
          view.otherErrorMessage=false;
          view.userpwdmissing = true;
          view.notvalidate = true;
        } else {
          if (err.error.message.includes('user not found') || err.error.message.includes('Wrong password')) {
            view.userpwdmissing = true;
            view.notvalidate = false;
            view.otherErrorMessage=true;
          }  
        }
        console.log(err.error);
      });
    } else {

      if ((view.loginForm.get('username').value=="" || view.loginForm.get('username').value==null) || (view.loginForm.get('password').value=="" || view.loginForm.get('password').value==null)) {
        view.notvalidate = true;
        view.userpwdmissing = false;
        view.otherErrorMessage=true;
      } else {
        view.notvalidate = false;
        view.userpwdmissing = true;
        view.otherErrorMessage=true;
      }
    }
  }



}
