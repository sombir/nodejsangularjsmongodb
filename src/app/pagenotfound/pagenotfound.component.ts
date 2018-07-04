import { Component, Output, EventEmitter, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; 
import { ActivatedRoute, Params } from '@angular/router'; 
import { CDSService } from '../../services/httpAPI.service';
import {CookieService} from 'angular2-cookie/core';
import * as $ from 'jquery';


@Component({
  selector: 'login',
  templateUrl: './pagenotfound.component.html',
  styleUrls: ['./pagenotfound.component.css']
})
export class PageNotFoundComponent {
	constructor(private router: Router, private loginData: CDSService, private _cookieService:CookieService){
	
	}
	title = 'app';
}
