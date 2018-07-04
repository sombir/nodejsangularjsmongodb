import {Component,OnInit,ViewChild,ElementRef,AfterViewInit,ChangeDetectorRef,Inject,ComponentFactoryResolver,ViewContainerRef} from '@angular/core';
import {Router,ActivatedRoute,Params} from '@angular/router';
import {CDSService} from '../../services/httpAPI.service';
import { ResponseData, ConfigBackupResponse, CheckbackupfilestatusResponse, ErrorResponse } from '../../models/response';
import { SharedService } from '../../services/shared.service';
import { Subject } from 'rxjs/Subject';
import { DataTableDirective } from 'angular-datatables';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import * as moment from 'moment';
import { BackupTableComponent } from '../cluster-detail/backup-table/backup-table.component';
@Component({
    selector: 'app-cluster-detail',
    templateUrl: './cluster-detail.component.html',
    styleUrls: ['./cluster-detail.component.css']
})
export class ClusterDetailComponent implements OnInit {
    @ViewChild('gaugeLicenseState') gaugeLicenseState: ElementRef;
    @ViewChild('barAPClusterdetail') barAPClusterdetail: ElementRef;
    @ViewChild('doughnutOSClusterdetail') doughnutOSClusterdetail: ElementRef;
    @ViewChild('barZoneAPCount') barZoneAPCount: ElementRef;
    @ViewChild('doughnutAPModelDistribution') doughnutAPModelDistribution: ElementRef;
    @ViewChild('barZoneClientCount') barZoneClientCount: ElementRef;
    @ViewChild('barOSDistribution') barOSDistribution: ElementRef;
    @ViewChild('backupTable', { read: ViewContainerRef }) backupTable: ViewContainerRef;
    @ViewChild(DataTableDirective)
    dataTableElement: DataTableDirective = null;
    dtOptions: any = {};
    dtTrigger: Subject < any > = new Subject();
    clusterIP: string = "";
    errorResponse: ErrorResponse;
    chartTitleFontSize: number = 16;
    chartTitleFontColor: any = '#8f99a4';
    update: {
        width,
        height
    } = {
        width: 0,
        height: 0
    };
    gaugeUpdate: {
        width,
        height,
        margin
    } = {
        width: 0,
        height: 0,
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0,
            pad: 20
        }
    };
    d3: any = Plotly.d3;
    gdGaugeLicenseState: any;
    gdBarAPClusterdetail: any;
    gdDoughnutOSClusterdetail: any;
    gdBarZoneAPCount: any;
    gdDoughnutAPModelDistribution: any;
    gdBarZoneClientCount: any;
    gdBarOSDistribution: any;
    graphListData: any;
    graphList: any;
    no_of_aps: any;
    no_of_dps: any;
    no_of_cps: any;
    no_of_os: any;
    apName: Array < string > = [];
    apOnline = [];
    apOffline = [];
    apFlagged = [];
    apTotal = [];
    sortedapTotal = [];
    clusterAPName = [];
    clusterAPOffline = [];
    clusterAPFlagged = [];
    clusterAPOnline = [];
    clusterName = [];
    osName = [];
    osCount = [];
    graphListAPModels = [];
    totalZone = [];
    sortedtotalZone = [];
    zoneAPName = [];
    zoneAPOnline = [];
    zoneAPOffline = [];
    zoneAPFlagged = [];
    apCountDist = [];
    apNameDist = [];
    zoneClients = [];
    sortedZoneClients = [];
    consumedLicenseStates: any;
    apState_online: any;
    apState_offline: any;
    apState_flagged: any;
    cpState_online: any;
    cpState_offline: any;
    cpState_flagged: any;
    dpState_online: any;
    dpState_offline: any;
    dpState_flagged: any;
    osTotal = [];
    sortedOSTotal = [];
    topOSType = [];
    topOSCount = [];
    viewCPList = [];
    viewDPList = [];
    viewZonesummary = [];
    viewAPModelList = [];
    viewClientOSSummary = [];
    cfgmgmtip: any;
    model: any;
    version: any;
    totclients: any;
    numofostypes: any;
    numofzones: any;
    numofapmodels: any;
    aplicense: any;
    no_of_apmodels: any;
    WIDTH_IN_PERCENT_OF_PARENT: number = 99;
    HEIGHT_IN_PERCENT_OF_PARENT: number = 100;
    chartAnnotationFontSize: number = 12;
    chartAnnotationFontColor: any = '#9A9B9C';
    clusterDetailTitle: string = '';
    clusterDetailMessage: string = '';
    fileList = [];
    message: String = '';
    modelTitle: String = '';
    backupDetails: {
        backupID,
        clusterIP
    } = {
        backupID: '',
        clusterIP: ''
    };
    downloadConfigResponse: ConfigBackupResponse;
    loaderDisplay: string = 'none';
    backupFileStatusResponse: CheckbackupfilestatusResponse;
    selectedFiles = [];
    backupFileId: any;
    wrongNoofUserSelected: boolean = false;
    timezone: string = "";
    loaderDisplayRestore: string = 'none';
    controllerid: String = '';
    backupKeyId: String = '';
    fileCreatedTime: String = '';
    selectedTime : any;
    enableDateTimePicker : boolean = false;
    isDisabled : boolean = true;
    syncTime : any ;
    constructor(private router: Router, private route: ActivatedRoute, private apiData: CDSService, private changeDetector: ChangeDetectorRef, private sharedService: SharedService, @Inject(LOCAL_STORAGE) private storage: WebStorageService,private componentFactoryResolver: ComponentFactoryResolver) {
        this.route.params.subscribe(params => {
            this.clusterIP = params.clusterIP;
        })
    }

    ngOnInit() {
        let view = this;
        this.timezone = this.storage.get('TimeZone');
        (<any>$('#startdatetimepicker')).datetimepicker();
        (<any>$('#enddatetimepicker')).datetimepicker();
        $('#clusterDetailOverlay').show();
        view.renderChartData();
        view.getConfigbackupFiles();
    }
    renderChartData() {
        let view = this;
        $('body').css('background-color', '#D9E0E7');
        if ($(window).width() > 1455) {
            view.update.width = 400;
            view.update.height = 400;
            view.gaugeUpdate.width = 130;
            view.gaugeUpdate.height = 130;
            if ($(window).width() < 1490) {
                view.gaugeUpdate.width = 130;
                view.gaugeUpdate.height = 130;
                view.gaugeUpdate.margin.r = 15;
                view.gaugeUpdate.margin.t = 15;
                view.gaugeUpdate.margin.b = 15;
                view.gaugeUpdate.margin.l = 15;
            }
        } else if ($(window).width() < 1455 && $(window).width() > 965) {
            view.update.width = 300;
            view.update.height = 300;
            view.gaugeUpdate.width = 130;
            view.gaugeUpdate.height = 130;
            if ($(window).width() < 1300) {
                view.gaugeUpdate.width = 130;
                view.gaugeUpdate.height = 130;
                view.gaugeUpdate.margin.r = 15;
                view.gaugeUpdate.margin.t = 15;
                view.gaugeUpdate.margin.b = 15;
                view.gaugeUpdate.margin.l = 15;
            }
            if ($(window).width() < 1200) {
                view.gaugeUpdate.width = 130;
                view.gaugeUpdate.height = 130;
                view.gaugeUpdate.margin.r = 15;
                view.gaugeUpdate.margin.t = 15;
                view.gaugeUpdate.margin.b = 15;
                view.gaugeUpdate.margin.l = 15;
            }
            if ($(window).width() < 1145) {
                view.gaugeUpdate.margin.r = 0;
                view.gaugeUpdate.margin.t = 0;
                view.update.width = 250;
                view.update.height = 250;
                view.gaugeUpdate.width = 130;
                view.gaugeUpdate.height = 130;
                if ($(window).width() < 1080) {
                    view.gaugeUpdate.margin.r = 15;
                    view.gaugeUpdate.margin.t = 15;
                    view.gaugeUpdate.margin.b = 15;
                    view.gaugeUpdate.margin.l = 15;
                }
            }

            if ($(window).width() > 1000 && $(window).width() < 1025) {
                view.update.width = 240;
                view.update.height = 250;
                view.gaugeUpdate.width = 130;
                view.gaugeUpdate.height = 130;
            }

            if ($(window).width() < 1000) {
                view.update.width = 200;
                view.update.height = 200;
                view.gaugeUpdate.margin.r = 15;
                view.gaugeUpdate.margin.t = 15;
                view.gaugeUpdate.margin.b = 15;
                view.gaugeUpdate.margin.l = 15;
            }
        } else if ($(window).width() < 965 && $(window).width() > 850) {
            view.update.width = 400;
            view.update.height = 400;
            view.gaugeUpdate.width = 160;
            view.gaugeUpdate.height = 160;
            view.gaugeUpdate.margin.r = 30;
            view.gaugeUpdate.margin.b = 30;
            view.gaugeUpdate.margin.l = 30;
        } else if ($(window).width() < 850 && $(window).width() > 750) {
            view.update.width = 300;
            view.update.height = 300;
            view.gaugeUpdate.width = 160;
            view.gaugeUpdate.height = 160;
            view.gaugeUpdate.margin.r = 30;
            view.gaugeUpdate.margin.b = 30;
            view.gaugeUpdate.margin.l = 30;
        } else if ($(window).width() < 750 && $(window).width() > 426) {
            view.update.width = 380;
            view.update.height = 400;
            view.gaugeUpdate.width = 160;
            view.gaugeUpdate.height = 160;
            view.gaugeUpdate.margin.r = 30;
            view.gaugeUpdate.margin.b = 30;
            view.gaugeUpdate.margin.l = 30;
        } else if ($(window).width() < 426) {
            view.update.width = 290;
            view.update.height = 400;
            view.gaugeUpdate.width = 160;
            view.gaugeUpdate.height = 160;
            view.gaugeUpdate.margin.r = 30;
            view.gaugeUpdate.margin.b = 30;
            view.gaugeUpdate.margin.l = 30;
        }

        view.viewCPList = [];
        view.viewDPList = [];
        view.apTotal = [];
        view.sortedapTotal = [];
        view.totalZone = [];
        view.sortedZoneClients = [];
        view.sortedtotalZone = [];
        view.osTotal = [];
        view.sortedOSTotal = [];
        view.consumedLicenseStates = 0;

        this.apiData.cdsCLusterDetailService(this.clusterIP).subscribe(function(val) {
            view.graphListData = val;
            view.graphList = view.graphListData.stats;
            view.apState_online = view.graphList.apState.online;
            view.apState_offline = view.graphList.apState.offline;
            view.apState_flagged = view.graphList.apState.flagged;
            view.cpState_online = view.graphList.cpState.online;
            view.cpState_offline = view.graphList.cpState.offline;
            view.cpState_flagged = view.graphList.cpState.flagged;
            view.dpState_online = view.graphList.dpState.online;
            view.dpState_offline = view.graphList.dpState.offline;
            view.dpState_flagged = view.graphList.dpState.flagged;
            view.clusterName = view.graphListData.stats.clusters[0].clusterName;
            view.syncTime = view.graphListData.stats.clusters[0].lastsynchtime;
            view.no_of_aps = view.graphList.apState.online + view.graphList.apState.offline + view.graphList.apState.flagged;
            view.no_of_dps = view.graphList.dpState.online + view.graphList.dpState.offline + view.graphList.dpState.flagged;
            view.no_of_cps = view.graphList.cpState.online + view.graphList.cpState.offline + view.graphList.cpState.flagged;
            view.no_of_os = view.graphList.osTypes.length;
            view.no_of_apmodels = view.graphList.apModels.length;
            view.graphListAPModels = view.graphList.apModels;
            console.log("cluster detail data", view.graphList);

            //finding value to move needle of License states
            view.consumedLicenseStates = ((((view.graphList.licenseState.consumed / view.graphList.licenseState.total)) * 100).toFixed(0));

            for (let ap of view.graphList.apModels) {
                view.apName.push(ap.apModel);
                view.apOnline.push(ap.apOnline);
                view.apOffline.push(ap.apOffline);
                view.apFlagged.push(ap.apFlagged);
                let newName1 = {
                    apFlagged: ap.apFlagged,
                    apOffline: ap.apOffline,
                    apOnline: ap.apOnline,
                    apName: ap.apModel,
                    total: (ap.apFlagged + ap.apOffline + ap.apOnline)
                };
                view.apTotal.push(newName1);
            }
            view.sortedapTotal = view.apTotal.sort(function(a, b) {
                return a.total == b.total ? 0 : +(a.total < b.total) || -1;
            });

            //OS Type Distribution Chart
            for (let i = 0; i < view.graphList.osTypes.length; i++) {
                view.osName[i] = view.graphListData.stats.osTypes[i].osType;
                view.osCount[i] = view.graphListData.stats.osTypes[i].count;
            }

            //Zones By AP and Client Count
            for (let ap of view.graphList.clusters) {
                for (let zone of ap.zonesummary) {
                    let newName1 = {
                        zoneFlagged: zone.apFlagged,
                        zoneOffline: zone.apOffline,
                        zoneOnline: zone.apOnline,
                        zoneName: zone.zoneName,
                        client: zone.client,
                        total: (zone.apFlagged + zone.apOffline + zone.apOnline)
                    };
                    view.totalZone.push(newName1);
                }
            }

            view.sortedZoneClients = view.totalZone.sort(function(a, b) {
                return a.client == b.client ? 0 : +(a.client < b.client) || -1;
            });

            view.sortedtotalZone = view.totalZone.sort(function(a, b) {
                return a.total == b.total ? 0 : +(a.total < b.total) || -1;
            });
            console.log(view.sortedZoneClients);



            //AP Model Distribution
            for (let i = 0; i < view.graphList.apModels.length; i++) {
                view.apNameDist[i] = view.apTotal[i].apName;
                view.apCountDist[i] = view.apTotal[i].total;
            }

            //Top 5 OS Types
            for (let os of view.graphList.osTypes) {
                let newName1 = {
                    type: os.osType,
                    count: os.count
                };
                view.osTotal.push(newName1);
            }
            view.sortedOSTotal = view.osTotal.sort(function(a, b) {
                return a.count == b.count ? 0 : +(a.count < b.count) || -1;
            });

            view.showGaugeLicenseState();
            view.showBarChartAPClusterDetail();
            view.showDoughnutChartOSClusterdetail();
            view.showBarZoneAPCount();
            view.showDoughnutAPModelDistribution();
            view.showBarZoneClientCount();
            view.showBarChartOSDistribution();

            //TAB 2
            //view.viewDPList = view.graphList.clusters[0].dplist;
            view.viewZonesummary = view.graphList.clusters[0].zonesummary;
            view.viewAPModelList = view.graphList.clusters[0].apmodelsummary;
            view.viewClientOSSummary = view.graphList.clusters[0].ostypesummary;
            view.viewClientOSSummary = view.graphList.clusters[0].ostypesummary;
            view.model = view.graphList.clusters[0].systemsummary.model;
            view.version = view.graphList.clusters[0].systemsummary.version;
            if (view.graphList.clusters[0].managementips.length == 1) {
                view.cfgmgmtip = view.graphList.clusters[0].managementips[0];
            } else {
                view.cfgmgmtip = view.graphList.clusters[0].managementips[view.graphList.clusters[0].managementips.length - 1];
            }

            view.totclients = view.graphList.totalClients;
            view.numofostypes = view.graphList.osTypes.length;
            view.numofzones = view.graphList.totalZones;
            view.numofapmodels = view.graphList.clusters[0].apmodelsummary.length;
            view.aplicense = view.graphList.clusters[0].apLicenseTotal;
            console.log("NUMBER", view.graphList.clusters[0]);
            
            for (let i = 0; i < view.graphList.clusters[0].cplist.length; i++) {
                var seconds = view.graphList.clusters[0].cplist[i].uptimeInSecs;
                var days = Math.floor(seconds / (24 * 60 * 60));
                seconds -= days * (24 * 60 * 60);
                var hours = Math.floor(seconds / (60 * 60));
                seconds -= hours * (60 * 60);
                var minutes = Math.floor(seconds / (60));
                seconds -= minutes * (60);
                var uptimeCP = ((0 < days) ? (days + "d ") : "") + hours + "h " + minutes + "m " + seconds + "s ";
                var diskUsage = ((view.graphList.clusters[0].cplist[i].diskUsed / view.graphList.clusters[0].cplist[i].diskTotal) * 100);
                if(diskUsage || diskUsage == 0){
                    let cpList = {
                        name: view.graphList.clusters[0].cplist[i].name,
                        status: view.graphList.clusters[0].cplist[i].status,
                        mac: view.graphList.clusters[0].cplist[i].mac,
                        version: view.graphList.clusters[0].cplist[i].version,
                        managementIp: view.graphList.clusters[0].cplist[i].managementIp,
                        role: view.graphList.clusters[0].cplist[i].role,
                        diskUsed: diskUsage.toFixed(2),
                        uptimeInSecs: uptimeCP
                    };
                    view.viewCPList.push(cpList);
                }
                else{
                    let cpList = {
                        name: view.graphList.clusters[0].cplist[i].name,
                        status: view.graphList.clusters[0].cplist[i].status,
                        mac: view.graphList.clusters[0].cplist[i].mac,
                        version: view.graphList.clusters[0].cplist[i].version,
                        managementIp: view.graphList.clusters[0].cplist[i].managementIp,
                        role: view.graphList.clusters[0].cplist[i].role,
                        diskUsed: 'N/A',
                        uptimeInSecs: uptimeCP 
                    };
                    view.viewCPList.push(cpList);
                }   
            }

            for (let i = 0; i < view.graphList.clusters[0].dplist.length; i++) {
                var seconds = view.graphList.clusters[0].dplist[i].uptimeInSecs;
                var days = Math.floor(seconds / (24 * 60 * 60));
                seconds -= days * (24 * 60 * 60);
                var hours = Math.floor(seconds / (60 * 60));
                seconds -= hours * (60 * 60);
                var minutes = Math.floor(seconds / (60));
                seconds -= minutes * (60);
                var uptimeDP = ((0 < days) ? (days + "d ") : "") + hours + "h " + minutes + "m " + seconds + "s ";
                let dpList = {
                    name: view.graphList.clusters[0].dplist[i].name,
                    status: view.graphList.clusters[0].dplist[i].status,
                    mac: view.graphList.clusters[0].dplist[i].mac,
                    version: view.graphList.clusters[0].dplist[i].version,
                    ip: view.graphList.clusters[0].dplist[i].ip,
                    uptimeInSecs: uptimeDP
                };
                view.viewDPList.push(dpList);
            }
            $('#clusterDetailOverlay').hide();
        }, function(err) {
            view.errorResponse = err;
                    $('.modal-backdrop').hide();
            $('#clusterDetailOverlay').hide();
            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.showAlert(view.errorResponse.title, view.errorResponse.message);
            }
        });
}
showBarChartAPClusterDetail() {
    let view = this;
    view.clusterAPName = [];
    view.clusterAPOnline = [];
    view.clusterAPOffline = [];
    view.clusterAPFlagged = [];
    let displayText = "";
    let greyBG = [];
    let largest = 0;
    let isData = false;
    const element = this.barAPClusterdetail.nativeElement;
    Plotly.purge(element);
    let gd3 = view.d3.select(element);
    view.gdBarAPClusterdetail = gd3.node();
    let length = view.sortedapTotal.length;
    if (length > 5) {
        length = 5;
    }
    let barGapValue = 0.2
    if (length == 1) {
        barGapValue = 0.4
    }
    if (length == 2) {
        barGapValue = 0.4
    }
    if (length == 3) {
        barGapValue = 0.4
    }
    if (length == 4) {
        barGapValue = 0.3
    }
    for (let i = 0; i < length; i++) {
        view.clusterAPName[i] = view.sortedapTotal[i].apName;
        view.clusterAPOnline[i] = view.sortedapTotal[i].apOnline;
        view.clusterAPOffline[i] = view.sortedapTotal[i].apOffline;
        view.clusterAPFlagged[i] = view.sortedapTotal[i].apFlagged;
        if (view.clusterAPOnline[i] != 0 || view.clusterAPOffline[i] != 0 || view.clusterAPFlagged[i] != 0) {
            isData = true;
        }
    }
    var trace1 = {
        x: view.clusterAPName,
        y: view.clusterAPOnline,
        name: 'Online',
        type: 'bar',
        marker: {
            color: '#A5C8E1'
        },
        hoverinfo : "Online + y"
    };
    var trace2 = {
        x: view.clusterAPName,
        y: view.clusterAPOffline,
        name: 'Offline',
        type: 'bar',
        marker: {
            color: '#941950'
        },
        hoverinfo : "Offline + y"
    };

    var trace3 = {
        x: view.clusterAPName,
        y: view.clusterAPFlagged,
        name: 'Flagged',
        type: 'bar',
        marker: {
            color: '#E8AB5F'
        },
        hoverinfo : "Flagged + y"
    };

    largest = view.clusterAPOnline[0] + view.clusterAPOffline[0] + view.clusterAPFlagged[0];
    greyBG[0] = 0;
    for (let i = 1; i < length; i++) {
        greyBG[i] = largest - (view.clusterAPOnline[i] + view.clusterAPOffline[i] + view.clusterAPFlagged[i]);
    }

    var trace4 = {
        x: view.clusterAPName,
        y: greyBG,
        name: '',
        hoverinfo: 'skip',
        type: 'bar',
        marker: {
            color: '#F8F8F8'
        }
    };

    if (!isData) {
        displayText = '<b>No Data Avaialble</b>';
    } else {
        displayText = '';
        var data = [trace1, trace2, trace3, trace4];
    }

    let layout = {
        title: '<b>Top 5 AP Models</b>',
        titlefont: {
            family: 'Arial',
            size: 16,
            color: '#8f99a4'
        },
        width: this.update.width,
        height: this.update.height,
        font: {
            size: 10
        },
        xaxis: {
            autorange: true,
            showgrid: false,
            zeroline: false,
            showline: false,
            autotick: true,
            ticks: '',
            showticklabels: false,
            fixedrange: true,
            hoverformat: '.f'
        },
        yaxis: {
            autorange: true,
            showgrid: false,
            zeroline: false,
            showline: false,
            autotick: true,
            ticks: '',
            showticklabels: false,
            fixedrange: true,
            hoverformat: '.r'
        },
        showlegend: false,
        margin: {
            l: 40,
            r: 40,
            t: 65,
            b: 40,
            pad: 0,
            autoexpand: false
        },
        bargap: barGapValue,
        barmode: 'stack',
        autosize: true,
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
        annotations: [{
            visible: true,
            opacity: 1,
            text: displayText,
            showarrow: false,
            textangle: 0,
            font: {
                family: 'Arial',
                size: this.chartAnnotationFontSize,
                color: this.chartAnnotationFontColor
            },
            x: 2.5,
            y: 1.5
        }]
    };

    Plotly.plot(element, data, layout, {
        displaylogo: false,
        displayModeBar: false
    });
}
showGaugeLicenseState() {
    let view = this;
    const element = this.gaugeLicenseState.nativeElement;
    var displayText = "";
    Plotly.purge(element);
    let gd3 = view.d3.select(element);
    view.gdGaugeLicenseState = gd3.node();
        // Enter a value between 0 and 100
        var level = view.consumedLicenseStates;

        // Trig to calc meter point
        var degrees = (100 - level),
        radius = .40;
        var radians = degrees * Math.PI / 100;
        var aX = 0.025 * Math.cos((degrees - 180) * Math.PI / 100);
        var aY = 0.025 * Math.sin((degrees - 180) * Math.PI / 100);
        var bX = -0.025 * Math.cos((degrees - 180) * Math.PI / 100);
        var bY = -0.025 * Math.sin((degrees - 180) * Math.PI / 100);
        var cX = radius * Math.cos(radians);
        var cY = radius * Math.sin(radians);

        // Path: may have to change to create a better triangle
        var path = 'M ' + aX + ' ' + aY +
        ' L ' + bX + ' ' + bY +
        ' L ' + cX + ' ' + cY +
        ' Z';
        if (level >= 0) {
            var data = [{
                type: 'scatter',
                x: [0],
                y: [0],
                marker: {
                    size: 9,
                    color: '919191'
                },
                showlegend: false,
                name: '',
                text: level + '%',
                hoverinfo: 'text+name'
            },
            {
                values: [10, 40, 50, 100],
                rotation: 90,
                text: '',
                direction: "clockwise",
                textinfo: 'text',
                textposition: 'inside',
                marker: {
                    colors: ['#941950', '#E7AB5F', '#A4C8E0', '#FFFFFF']
                },
                labels: ['90%-100%', '50%-90%', '0-50%', ''],
                hoverinfo: 'label',
                hole: .5,
                type: 'pie',
                showlegend: false
            }
            ];
            var layout = {
                shapes: [{
                    type: 'path',
                    path: path,
                    fillcolor: '919191',
                    line: {
                        color: '919191',
                        width: 0.5
                    }
                }],
                margin: view.gaugeUpdate.margin,
                title: '',
                height: view.gaugeUpdate.height,
                width: view.gaugeUpdate.width,
                xaxis: {
                    zeroline: false,
                    showticklabels: false,
                    showgrid: false,
                    range: [-1, 1],
                    fixedrange: true
                },
                yaxis: {
                    zeroline: false,
                    showticklabels: false,
                    showgrid: false,
                    range: [-1, 1],
                    fixedrange: true
                },
                annotations: [{
                    font: {
                        size: 12,
                        color: '#9A9B9C'
                    },
                    showarrow: false,
                    text: level + '%',
                    x: 0.01,
                    y: -0.18,
                }],
            };
        } else {
            displayText = '<b>No Data Available</b>';
            var data = [{
                type: 'scatter',
                x: [0],
                y: [0],
                marker: {
                    size: 9,
                    color: '919191'
                },
                showlegend: false,
                name: '',
                text: '',
                hoverinfo: ''
            },
            {
                values: [10, 40, 50, 100],
                rotation: 90,
                text: '',
                direction: "clockwise",
                textinfo: 'text',
                textposition: 'inside',
                marker: {
                    colors: ['#941950', '#E7AB5F', '#A4C8E0', '#FFFFFF']
                },
                labels: ['90%-100%', '50%-90%', '0-50%', ''],
                hoverinfo: 'label',
                hole: .5,
                type: 'pie',
                showlegend: false
            }
            ];
            var layout = {
                shapes: [{
                    type: 'path',
                    path: path,
                    fillcolor: '919191',
                    line: {
                        color: '919191',
                        width: 0.5
                    }
                }],
                margin: view.gaugeUpdate.margin,
                title: '',
                height: view.gaugeUpdate.height,
                width: view.gaugeUpdate.width,
                xaxis: {
                    zeroline: false,
                    showticklabels: false,
                    showgrid: false,
                    range: [-1, 1],
                    fixedrange: true
                },
                yaxis: {
                    zeroline: false,
                    showticklabels: false,
                    showgrid: false,
                    range: [-1, 1],
                    fixedrange: true
                },
                annotations: [{
                    font: {
                        size: 12,
                        color: '#9A9B9C'
                    },
                    showarrow: false,
                    text: displayText,
                    x: 0.01,
                    y: -0.18,
                }],
            };
        }

        Plotly.plot(element, data, layout, {
            displaylogo: false,
            displayModeBar: false
        });

        //$( ".blockcontainer div:first-child" ).children().css( "margin-top", "-92px !important" );

        //$(".gauge-chart div:first-child").css("margin-top", "-92px !important");

        

    }
    showDoughnutChartOSClusterdetail() {
        let view = this;
        const element = this.doughnutOSClusterdetail.nativeElement;
        Plotly.purge(element);
        let gd3 = view.d3.select(element);
        let displayText = "";
        view.gdDoughnutOSClusterdetail = gd3.node();
        const data = [{
            values: view.osCount,
            name: 'APs',
            labels: view.osName,
            hoverinfo: 'text+value',
            textinfo: 'none',
            marker: {
                colors: ['#A5C8E1', '#E8AB5F', '#941950', '#AC6BCA', '#B56B8e', 'F8A35F']
            },
            pull: 0,
            hole: 0.6,
            type: 'pie'
        }];

        if (view.no_of_os > 0) {
            displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.no_of_os + '</span>';
        } else {
            displayText = '<b>No Data Available</b>'
        }

        let layout = {
            title: '<b>OS Type Distribution</b>',
            titlefont: {
                family: 'Arial',
                size: 16,
                color: '#999'
            },
            autosize: true,
            width: this.update.width,
            height: this.update.height,
            margin: {
                l: 40,
                r: 40,
                t: 65,
                b: 40,
                pad: 0,
                autoexpand: false
            },
            showlegend: false,
            annotations: [{
                font: {
                    family: 'Arial',
                    size: this.chartAnnotationFontSize,
                    color: this.chartAnnotationFontColor
                },
                showarrow: false,
                text: displayText,
                x: 0.5,
                y: 0.5
            }],
            paper_bgcolor: '#ffffff'
        };

        Plotly.plot(element, data, layout, {
            displaylogo: false,
            displayModeBar: false
        });
    }

    showBarZoneAPCount() {
        let view = this;
        const element = this.barZoneAPCount.nativeElement;
        Plotly.purge(element);
        let gd3 = view.d3.select(element);
        let isData = false;
        let displayText = "";
        let largest = 0;
        let greyBG = [];
        view.gdBarZoneAPCount = gd3.node();
        let length = view.sortedtotalZone.length;
        if (length > 5) {
            length = 5;
        }
        let barGapValue = 0.2
        if (length == 1) {
            barGapValue = 0.4
        }
        if (length == 2) {
            barGapValue = 0.4
        }
        if (length == 3) {
            barGapValue = 0.4
        }
        if (length == 4) {
            barGapValue = 0.3
        }

        for (let i = 0; i < length; i++) {
            view.zoneAPName[i] = view.sortedtotalZone[i].zoneName;
            view.zoneAPOnline[i] = view.sortedtotalZone[i].zoneOnline;
            view.zoneAPOffline[i] = view.sortedtotalZone[i].zoneOffline;
            view.zoneAPFlagged[i] = view.sortedtotalZone[i].zoneFlagged;
            if (view.zoneAPOnline[i] != 0 || view.zoneAPOffline[i] != 0 || view.zoneAPFlagged[i] != 0) {
                isData = true;
            }
        }
        var trace1 = {
            x: view.zoneAPName,
            y: view.zoneAPOnline,
            name: 'Online',
            type: 'bar',
            marker: {
                color: '#A5C8E1'
            },
            hoverinfo : "Online + y"
        };

        var trace2 = {
            x: view.zoneAPName,
            y: view.zoneAPOffline,
            name: 'Offline',
            type: 'bar',
            marker: {
                color: '#941950'
            },
            hoverinfo : "Offline + y"
        };

        var trace3 = {
            x: view.zoneAPName,
            y: view.zoneAPFlagged,
            name: 'Flagged',
            type: 'bar',
            marker: {
                color: '#E8AB5F'
            },
            hoverinfo : "Flagged + y"
        };

        largest = view.zoneAPOnline[0] + view.zoneAPOffline[0] + view.zoneAPFlagged[0];
        greyBG[0] = 0;
        for (let i = 1; i < length; i++) {
            greyBG[i] = largest - (view.zoneAPOnline[i] + view.zoneAPOffline[i] + view.zoneAPFlagged[i]);
        }

        var trace4 = {
            x: view.zoneAPName,
            y: greyBG,
            name: '',
            hoverinfo: 'skip',
            type: 'bar',
            marker: {
                color: '#F8F8F8'
            }
        };

        if (!isData) {
            displayText = '<b>No Data Available</b>';
        } else {
            displayText = "";
            var data = [trace1, trace2, trace3, trace4];
        }
        let layout = {
            title: '<b>Top 5 Zones by AP Count</b>',
            titlefont: {
                family: 'Arial',
                size: 16,
                color: '#8f99a4'
            },
            width: this.update.width,
            height: this.update.height,
            font: {
                size: 10
            },
            xaxis: {
                autorange: true,
                showgrid: false,
                zeroline: false,
                showline: false,
                autotick: true,
                ticks: '',
                showticklabels: false,
                fixedrange: true,
                hoverformat: '.f'
            },
            yaxis: {
                autorange: true,
                showgrid: false,
                zeroline: false,
                showline: false,
                autotick: true,
                ticks: '',
                showticklabels: false,
                fixedrange: true,
                hoverformat: '.r'
            },
            margin: {
                l: 40,
                r: 40,
                t: 65,
                b: 40,
                pad: 0,
                autoexpand: false
            },
            showlegend: false,
            barmode: 'stack',
            bargap: barGapValue,
            autosize: true,
            paper_bgcolor: '#ffffff',
            plot_bgcolor: '#ffffff',
            annotations: [{
                visible: true,
                opacity: 1,
                text: displayText,
                showarrow: false,
                textangle: 0,
                font: {
                    family: 'Arial',
                    size: this.chartAnnotationFontSize,
                    color: this.chartAnnotationFontColor
                },
                x: 2.5,
                y: 1.5
            }]
        };

        Plotly.plot(element, data, layout, {
            displaylogo: false,
            displayModeBar: false
        });
    }
    showDoughnutAPModelDistribution() {
        let view = this;
        const element = this.doughnutAPModelDistribution.nativeElement;
        Plotly.purge(element);
        let gd3 = view.d3.select(element);
        let displayText = "";
        view.gdDoughnutAPModelDistribution = gd3.node();
        const data = [{
            values: view.apCountDist,
            labels: view.apNameDist,
            name: 'APs',
            legend: {
                orientation: 'h',
                showlegend: true,
                font: {
                    size: 8
                },
                x: 0,
                y: 0
            },
            hoverinfo: 'label+value',
            textinfo: 'none',
            marker: {
                colors: ['#A5C8E1', '#E8AB5F', '#941950', '#AC6BCA', '#B56B8e', 'F8A35F']
            },
            pull: 0,
            hole: 0.6,
            type: 'pie'
        }];
        if (view.no_of_apmodels > 0) {
            displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.no_of_apmodels + '</span>';
        } else {
            displayText = '<b>No Data Available</b>'
        }
        let layout = {
            title: '<b>AP Model Distribution</b>',
            titlefont: {
                family: 'Arial',
                size: 16,
                color: '#999'
            },
            autosize: true,
            width: this.update.width,
            height: this.update.height,
            margin: {
                l: 40,
                r: 40,
                t: 65,
                b: 40,
                pad: 0,
                autoexpand: false
            },
            showlegend: false,
            annotations: [{
                font: {
                    family: 'Arial',
                    size: this.chartAnnotationFontSize,
                    color: this.chartAnnotationFontColor
                },
                showarrow: false,
                text: displayText,
                x: 0.5,
                y: 0.5
            }],
            paper_bgcolor: '#ffffff'
        };
        Plotly.plot(element, data, layout, {
            displaylogo: false,
            displayModeBar: false
        });
    }
    showBarZoneClientCount() {
        let view = this;
        const element = this.barZoneClientCount.nativeElement;
        Plotly.purge(element);
        let isData = false;
        let displayText = "";
        let largest = 0;
        let greyBG = [];
        let gd3 = view.d3.select(element);
        view.gdBarZoneClientCount = gd3.node();
        let length = view.sortedZoneClients.length;
        if (length > 5) {
            length = 5;
        }
        let barGapValue = 0.2
        if (length == 1) {
            barGapValue = 0.4
        }
        if (length == 2) {
            barGapValue = 0.4
        }
        if (length == 3) {
            barGapValue = 0.4
        }
        if (length == 4) {
            barGapValue = 0.3
        }

        for (let i = 0; i < length; i++) {
            view.zoneAPName[i] = view.sortedZoneClients[i].zoneName;
            view.zoneClients[i] = view.sortedZoneClients[i].client;
            if (view.zoneClients[i] != 0) {
                isData = true;
            }
        }
        var trace1 = {
            x: view.zoneAPName,
            y: view.zoneClients,
            name: 'Clients',
            type: 'bar',
            marker: {
                color: '#A5C8E1'
            },
            hoverinfo : "Clients + y"
        };

        largest = view.zoneClients[0];
        greyBG[0] = 0;
        for (let i = 1; i < length; i++) {
            greyBG[i] = largest - (view.zoneClients[i]);
        }

        var trace2 = {
            x: view.zoneAPName,
            y: greyBG,
            name: '',
            hoverinfo: 'skip',
            type: 'bar',
            marker: {
                color: '#F8F8F8'
            }
        };

        if (!isData) {
            displayText = '<b>No Data Available</b>';
        } else {
            displayText = "";
            var data = [trace1, trace2];
        }
        let layout = {
            title: '<b>Top 5 Zones by Client Count</b>',
            titlefont: {
                family: 'Arial',
                size: 15,
                color: '#8f99a4'
            },
            width: this.update.width,
            height: this.update.height,
            font: {
                size: 10
            },
            xaxis: {
                autorange: true,
                showgrid: false,
                zeroline: false,
                showline: false,
                autotick: true,
                ticks: '',
                showticklabels: false,
                fixedrange: true,
                hoverformat: '.f'
            },
            yaxis: {
                autorange: true,
                showgrid: false,
                zeroline: false,
                showline: false,
                autotick: true,
                ticks: '',
                showticklabels: false,
                fixedrange: true,
                hoverformat: '.r'
            },
            margin: {
                l: 40,
                r: 40,
                t: 65,
                b: 40,
                pad: 0,
                autoexpand: false
            },
            showlegend: false,
            barmode: 'stack',
            bargap: barGapValue,
            autosize: true,
            paper_bgcolor: '#ffffff',
            plot_bgcolor: '#ffffff',
            annotations: [{
                visible: true,
                opacity: 1,
                text: displayText,
                showarrow: false,
                textangle: 0,
                font: {
                    family: 'Arial',
                    size: this.chartAnnotationFontSize,
                    color: this.chartAnnotationFontColor
                },
                x: 2.5,
                y: 1.5
            }]
        };

        Plotly.plot(element, data, layout, {
            displaylogo: false,
            displayModeBar: false
        });
    }
    showBarChartOSDistribution() {
        let view = this;
        const element = this.barOSDistribution.nativeElement;
        Plotly.purge(element);
        let isData = false;
        let displayText = "";
        let largest = 0;
        let greyBG = [];
        let gd3 = view.d3.select(element);
        view.gdBarOSDistribution = gd3.node();
        let length = view.sortedOSTotal.length;
        if (length > 5) {
            length = 5;
        }
        let barGapValue = 0.2
        if (length == 1) {
            barGapValue = 0.4
        }
        if (length == 2) {
            barGapValue = 0.4
        }
        if (length == 3) {
            barGapValue = 0.4
        }
        if (length == 4) {
            barGapValue = 0.3
        }

        for (let i = 0; i < length; i++) {
            view.topOSType[i] = view.sortedOSTotal[i].type;
            view.topOSCount[i] = view.sortedOSTotal[i].count;
            if (view.topOSCount[i] != 0) {
                isData = true;
            }
        }
        var trace1 = {
            x: view.topOSType,
            y: view.topOSCount,
            name: 'Online',
            type: 'bar',
            marker: {
                color: '#A5C8E1'
            },
            hoverinfo : "Online + y"
        };

        largest = view.topOSCount[0];
        greyBG[0] = 0;
        for (let i = 1; i < length; i++) {
            greyBG[i] = largest - (view.topOSCount[i]);
        }

        var trace2 = {
            x: view.topOSType,
            y: greyBG,
            name: '',
            hoverinfo: 'skip',
            type: 'bar',
            marker: {
                color: '#F8F8F8'
            }
        };

        var data = [trace1, trace2];
        if (!isData) {
            displayText = '<b>No Data Available</b>';
        } else {
            displayText = "";
        }
        let layout = {
            title: '<b>Top 5 OS Types</b>',
            titlefont: {
                family: 'Arial',
                size: 16,
                color: '#8f99a4'
            },
            width: this.update.width,
            height: this.update.height,
            font: {
                size: 10
            },
            xaxis: {
                autorange: true,
                showgrid: false,
                zeroline: false,
                showline: false,
                autotick: true,
                ticks: '',
                showticklabels: false,
                fixedrange: true,
                hoverformat: '.f'
            },
            yaxis: {
                autorange: true,
                showgrid: false,
                zeroline: false,
                showline: false,
                autotick: true,
                ticks: '',
                showticklabels: false,
                fixedrange: true,
                hoverformat: '.r'
            },
            margin: {
                l: 40,
                r: 40,
                t: 65,
                b: 40,
                pad: 0,
                autoexpand: false
            },
            showlegend: false,
            barmode: 'stack',
            bargap: barGapValue,
            autosize: true,
            paper_bgcolor: '#ffffff',
            plot_bgcolor: '#ffffff',
            annotations: [{
                visible: true,
                opacity: 1,
                text: displayText,
                showarrow: false,
                textangle: 0,
                font: {
                    family: 'Arial',
                    size: this.chartAnnotationFontSize,
                    color: this.chartAnnotationFontColor
                },
                x: 2,
                y: 0
            }]
        };

        Plotly.plot(element, data, layout, {
            displaylogo: false,
            displayModeBar: false
        });
    }

    ngAfterViewInit() {
        let view = this;
        this.changeDetector.detectChanges();

    }

    makeResponsive() {
        console.log($(window).width());

        let update = {
            width: 0,
            height: 0
        };
        let gaugeUpdate = {
            width: 0,
            height: 0,
            margin: {
                l: 0,
                r: 0,
                b: 0,
                t: 0,
                pad: 0
            }
        };

        if ($(window).width() > 1455) {
            update.width = 400;
            update.height = 400;
            gaugeUpdate.width = 130;
            gaugeUpdate.height = 130;
            if ($(window).width() < 1490) {
                gaugeUpdate.width = 130;
                gaugeUpdate.height = 130;
                gaugeUpdate.margin.r = 15;
                gaugeUpdate.margin.t = 15;
                gaugeUpdate.margin.b = 15;
                gaugeUpdate.margin.l = 15;
            }
        } else if ($(window).width() < 1455 && $(window).width() > 965) {
            update.width = 300;
            update.height = 300;
            gaugeUpdate.width = 130;
            gaugeUpdate.height = 130;
            if ($(window).width() < 1300) {
                gaugeUpdate.width = 130;
                gaugeUpdate.height = 130;
                gaugeUpdate.margin.r = 15;
                gaugeUpdate.margin.t = 15;
                gaugeUpdate.margin.b = 15;
                gaugeUpdate.margin.l = 15;
            }
            if ($(window).width() < 1200) {
                gaugeUpdate.width = 130;
                gaugeUpdate.height = 130;
                gaugeUpdate.margin.r = 15;
                gaugeUpdate.margin.t = 15;
                gaugeUpdate.margin.b = 15;
                gaugeUpdate.margin.l = 15;
            }
            if ($(window).width() < 1145) {
                gaugeUpdate.margin.r = 0;
                gaugeUpdate.margin.t = 0;
                update.width = 250;
                update.height = 250;
                gaugeUpdate.width = 130;
                gaugeUpdate.height = 130;
                if ($(window).width() < 1080) {
                    gaugeUpdate.margin.r = 15;
                    gaugeUpdate.margin.t = 15;
                    gaugeUpdate.margin.b = 15;
                    gaugeUpdate.margin.l = 15;
                }
            }

            if ($(window).width() > 1000 && $(window).width() < 1025) {
                update.width = 240;
                update.height = 250;
                gaugeUpdate.width = 130;
                gaugeUpdate.height = 130;
            }

            if ($(window).width() < 1000) {
                update.width = 200;
                update.height = 200;
                gaugeUpdate.margin.r = 15;
                gaugeUpdate.margin.t = 15;
                gaugeUpdate.margin.b = 15;
                gaugeUpdate.margin.l = 15;
            }
        } else if ($(window).width() < 965 && $(window).width() > 850) {
            update.width = 400;
            update.height = 400;
            gaugeUpdate.width = 160;
            gaugeUpdate.height = 160;
            gaugeUpdate.margin.r = 30;
            gaugeUpdate.margin.b = 30;
            gaugeUpdate.margin.l = 30;
        } else if ($(window).width() < 850 && $(window).width() > 750) {
            update.width = 300;
            update.height = 300;
            gaugeUpdate.width = 160;
            gaugeUpdate.height = 160;
            gaugeUpdate.margin.r = 30;
            gaugeUpdate.margin.b = 30;
            gaugeUpdate.margin.l = 30;
        } else if ($(window).width() < 750 && $(window).width() > 426) {
            update.width = 380;
            update.height = 400;
            gaugeUpdate.width = 160;
            gaugeUpdate.height = 160;
            gaugeUpdate.margin.r = 30;
            gaugeUpdate.margin.b = 30;
            gaugeUpdate.margin.l = 30;
        } else if ($(window).width() < 426) {
            update.width = 290;
            update.height = 400;
            gaugeUpdate.width = 160;
            gaugeUpdate.height = 160;
            gaugeUpdate.margin.r = 30;
            gaugeUpdate.margin.b = 30;
            gaugeUpdate.margin.l = 30;
        }
        Plotly.relayout(this.gdGaugeLicenseState, gaugeUpdate);
        Plotly.relayout(this.gdBarAPClusterdetail, update);
        Plotly.relayout(this.gdDoughnutOSClusterdetail, update);
        Plotly.relayout(this.gdBarZoneAPCount, update);
        Plotly.relayout(this.gdDoughnutAPModelDistribution, update);
        Plotly.relayout(this.gdBarZoneClientCount, update);
        Plotly.relayout(this.gdBarOSDistribution, update);
    }

    updateLiveData() {
        let view = this;
        $('#clusterDetailOverlay').show();
        view.apiData.cdsCLusterDetailServiceLive(this.clusterIP).subscribe(function(val) {
            if (val.success == true) {
                view.renderChartData();
                view.router.navigate(['/dashboard/clusterDetail/' + view.clusterIP]);
            } else {
                $('#clusterDetailOverlay').hide();
                view.showAlert('Error', val.message);
            }
        }, function(err) {
            view.errorResponse = err;
                    $('.modal-backdrop').hide();
            $('#clusterDetailOverlay').hide();
            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.showAlert(view.errorResponse.title, view.errorResponse.message);
            }
        });
    }
    syncClusterConfig() {
        let view = this;
        $('#clusterSyncModal').modal('hide');
        $('#clusterDetailOverlay').show();
        view.apiData.cdsCLusterConfigSync(view.clusterIP).subscribe(function(val) {
            if (val.success == true) {
                view.renderChartData();
                view.router.navigate(['/dashboard/clusterDetail/' + view.clusterIP]);
            } else {
                $('#clusterDetailOverlay').hide();
                view.showAlert('Error', val.message);
            }
        }, function(err) {
            view.errorResponse = err;
                    $('.modal-backdrop').hide();
            $('#clusterDetailOverlay').hide();
            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.showAlert(view.errorResponse.title, view.errorResponse.message);
            }
        });
    }

    getConfigbackupFiles() {
        let view = this;
        $('#overlay').show();
        view.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 10,
            dom: "Z<'row'<'col-12'tr>>",
            order: [],
            columnDefs: [{
                orderable: false,
                targets: 'no-sort'
            }],
            language: {
                emptyTable: "No data available in table",
                info: "_START_ - _END_ of _TOTAL_",
                infoEmpty: "0 - 0 of 0",
                lengthMenu: "Show _MENU_",
                zeroRecords: "",
                searchPlaceholder: "Search File"
            }
        };
        view.apiData.getConfigbackupFiles(this.clusterIP).subscribe(function(val) {
            console.log(val.list);
            view.fileList = val.list;
            view.dtTrigger.next();
            $('#overlay').hide();
        }, function(err) {
            view.errorResponse = err;
                    $('.modal-backdrop').hide();
            $('#clusterDetailOverlay').hide();
            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.showAlert(view.errorResponse.title, view.errorResponse.message);
            }
        });
    }

    downloadConfig(clusterip) {
        let view = this;
        let clusterIp = this.clusterIP;
        $('#configDownloadOverlay').show();
        view.apiData.manualConfigBackup(clusterIp).subscribe(res => {
            $('#configDownloadOverlay').hide();
            if (!res.success) {
                view.modelTitle = 'Error';
            } else {
                view.modelTitle = 'Info';
            }
            view.message = res.message;
            $('#modelDialogBckupSettings').modal('show');
            let response = res.data;
            view.downloadConfigResponse = res;
            view.backupDetails.backupID = view.downloadConfigResponse.backupId;
            view.backupDetails.clusterIP = clusterIp;
            view.refreshConfigTableList();
        }, function(err) {
            view.errorResponse = err;
                    $('.modal-backdrop').hide();
            $('#clusterDetailOverlay').hide();
            if (view.errorResponse.message.includes('Session')) {
                view.sharedService.logout(true);
            } else {
                view.showAlert(view.errorResponse.title, view.errorResponse.message);
            }
        });
    }
    onOkBckupSettings() {
        let view = this;
        if (view.modelTitle == 'Info') {
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();

            view.apiData.checkbackupfilestatus(view.backupDetails.backupID, view.backupDetails.clusterIP).subscribe(res => {
                console.log(res);
                view.backupFileStatusResponse = res;
                if (view.backupFileStatusResponse.download) {
                    // if (view.router.url.includes('configBackups')) {
                        view.modelTitle = 'Success';
                        view.message = view.backupFileStatusResponse.message;
                        setTimeout(() => {
                            $('#modelDialogBckupSettings').modal('show');
                        }, 2000)
                    } else {
                        view.modelTitle = 'Error';
                        view.message = view.backupFileStatusResponse.message;
                        $('#modelDialogBckupSettings').modal('show');
                    }
                    view.refreshConfigTableList();
                }, function(err) {
                    view.errorResponse = err;
                    $('.modal-backdrop').hide();
                    $('#clusterDetailOverlay').hide();
                    if (view.errorResponse.message.includes('Session')) {
                        view.sharedService.logout(true);
                    } else if(view.errorResponse.message.includes('Request')) {
						view.showAlert("Alert", "Config download taking time, please refresh the list after few minutes to get config file status");
					} else {
                        view.showAlert(view.errorResponse.title, view.errorResponse.message);
                    }
                });
            $('#modelDialogBckupSettings .close').click();
        } else if (view.modelTitle == 'Error') {
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();
            view.refreshConfigTableList();
        } else if (view.modelTitle == 'Success') {
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();
            view.refreshConfigTableList();
        } else {
            view.modelTitle = '';
            view.message = '';
            $('#modelDialogBckupSettings .close').click();
            view.refreshConfigTableList();
        }
    }

    refreshConfigTableList() {
        let view = this;
        this.dataTableElement.dtInstance.then((dtInstance: DataTables.Api) => {
            // Destroy the table first
            dtInstance.destroy();
            // Call the dtTrigger to rerender again
            view.selectedFiles = [];
            view.getConfigbackupFiles();
            view.isDisabled = true;
        });
    }
    selectToken(data, isSelected: boolean) {
        let view = this;
        view.backupFileId = data._id;
        if (isSelected) {
            view.selectedFiles.push(data);
            if(view.selectedFiles.length >= 1)
                view.isDisabled = false;
            else
                view.isDisabled = true;
            console.log("selectedFiles", view.selectedFiles);
        } else {
            let index = view.selectedFiles.indexOf(
                view.selectedFiles.find(function(obj): boolean {
                    return obj == data;
                })
                );
            view.selectedFiles.splice(index, 1);
            if(view.selectedFiles.length >= 1)
                view.isDisabled = false;
            else
                view.isDisabled = true;
            console.log("after splice", view.selectedFiles);
        }
        // this.selectedAll = this.apiKeysList.every(function(item: any) {
        //     return item.select == true;
        // });
    }

    downloadFile() {
        let view = this;

        if (view.selectedFiles.length == 1) {
            let fileId = view.backupFileId; //backupFileId
            $('#configDownloadOverlay').show();
            this.apiData.getConfigBackupFileInfo(fileId).subscribe(res => {
                if (!res.success) {
                    this.modelTitle = 'Error';
                    this.message = res.message;
                    $('#modelDialogBckupSettings').modal('show');

                }
                let response = res.data;
                $('#configDownloadOverlay').hide();
                const filename = response.filename;
                const data = response.data;
                var fileData = view.base64ToArrayBuffer(data);
                var a = document.createElement("a");
                document.body.appendChild(a);
                var blob = new Blob([fileData], {
                    type: "octet/stream"
                });
                if (window.navigator.msSaveBlob) { // IE
                    window.navigator.msSaveOrOpenBlob(blob, filename)
                } else {
                    var url = window.URL.createObjectURL(blob);
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    a.click();
                    window.URL.revokeObjectURL(url);
                }
            }, function(err) {
                view.errorResponse = err;
                    $('.modal-backdrop').hide();
                $('#clusterDetailOverlay').hide();
                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.showAlert(view.errorResponse.title, view.errorResponse.message);
                }
            });
        } else if ((view.selectedFiles.length == 0) || view.selectedFiles.length > 1) {
            view.wrongNoofUserSelected = true;
            this.modelTitle = 'Download Config Backup File';
            this.message = 'Please select one file to download';
            $('#modelDialogBckupSettings').modal('show');
        }
    }
    base64ToArrayBuffer(base64) {
        var binaryString = window.atob(base64);
        var binaryLen = binaryString.length;
        var bytes = new Uint8Array(binaryLen);
        for (var i = 0; i < binaryLen; i++) {
            var ascii = binaryString.charCodeAt(i);
            bytes[i] = ascii;
        }
        return bytes;
    }
    restoreConfigBackup() {
        let view = this;
        if (view.selectedFiles.length == 1) {
            let fileId = view.backupFileId; //backupFileId
            $('#modelDialogRestoreBckup').modal('hide');
            $('#configDownloadOverlay').show();
            view.apiData.uploadbackuptocontroller(fileId).subscribe(function(val) {
                $('#configDownloadOverlay').hide();
                if (val.success == true) {
                    if(val.data && val.data.backupKeyOnController){
                        view.controllerid = val.data.controllerId;
                        view.backupKeyId = val.data.backupKeyOnController;
                        view.fileCreatedTime = moment(val.data.backupCreateDate).format("YYYY/MM/DD H:mm:ss");
                        $('#modelDialogRestoreBckupConfirm').modal('show');
                    } else {
                        view.modelTitle = 'Alert';
                        view.message = val.message;
                        $('#modelDialogRestoreBckup').modal('show');
                    }
                } else {
                    view.modelTitle = 'Error';
                    view.message = val.message;
                    $('#modelDialogRestoreBckup').modal('show');
                }
            }, function(err) {
                view.loaderDisplayRestore = 'none';
                view.errorResponse = err;
                    $('.modal-backdrop').hide();
                $('#clusterDetailOverlay').hide();
                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.showAlert(view.errorResponse.title, view.errorResponse.message);
                }
            });
        } else if ((view.selectedFiles.length == 0) || view.selectedFiles.length > 1) {
            this.modelTitle = 'Restore Backup';
            this.message = 'Please select one file to restore backup';
            $('#modelDialogRestoreBckup').modal('show');
        }
    }
    selectedTimeFrame(flag,timeframe){
        console.log("value",timeframe);
        let view = this;
        let currentDateTime;
        let selectedDateTime;
        view.selectedTime = $("#timeFrame").val();
        if(flag){
            $("#timeFrame").val("24Hours");
            view.enableDateTimePicker = false;
            view.showModalBackupLog(true,'24Hours');
        } 
        if(flag == false && $("#timeFrame").val() == 'custom'){
            view.enableDateTimePicker = true;
            //view.showModalBackupLog(true,view.selectedTime);
        }
        if(timeframe == 'custom'){    //////////////////// TO DO
            $('.nav-tabs a[href="#tab10"]').tab('show');
            $("#timeFrame").val("custom");
            view.enableDateTimePicker = true;
            currentDateTime = view.getCurrentDateTime(false,timeframe);
            selectedDateTime = view.getStartDateTime(view.selectedFiles[0].backupTimestamp);
            console.log("CurrentDateTime",currentDateTime);
            console.log("selectedDateTime",selectedDateTime);
            $("#startdatetime").val(selectedDateTime);
            $("#enddatetime").val(currentDateTime.datetimeSet);
            view.showModalBackupLog(false,'custom');

        }
        if(flag == false && $("#timeFrame").val() != 'custom'){
            view.enableDateTimePicker = false;
            view.showModalBackupLog(true,view.selectedTime);
        }
        // else{
        //     view.enableDateTimePicker = false;
        //     view.showModalBackupLog(true,view.selectedTime);
        // }
        console.log('selectedTime',view.selectedTime);
    }
    showModalBackupLog(isSetStartDateTime,timeframe){
        let view = this;
        let startDateTime: any = '';
        let endDateTime: any = '';
        let datetime: any = {};
        let datetimeless: any = {}; 
        let clusterIp = this.clusterIP;

        if (isSetStartDateTime && timeframe != 'custom'){
            view.selectedTime = timeframe;
            datetime = view.getCurrentDateTime(false,timeframe);
            datetimeless = view.getCurrentDateTime(true,timeframe);
            startDateTime = datetimeless.datetimeSend;
            endDateTime = datetime.datetimeSend;
            $("#startdatetime").val(datetimeless.datetimeSet);
            $("#enddatetime").val(datetime.datetimeSet);
            view.getBackupTableData(startDateTime,endDateTime);
        } else {
            if($("#startdatetime").val() == '' && $("#enddatetime").val() == ''){
                this.modelTitle = "Error";
                this.message = "Enter Start Date and End date";
                $('#modelDialogRestoreBckup').modal('show');
            }else if($("#startdatetime").val() == ''){
                this.modelTitle = "Error";
                this.message = "Enter Start Date";
                $('#modelDialogRestoreBckup').modal('show');
            }else if($("#enddatetime").val() == ''){
                this.modelTitle = "Error";
                this.message = "Enter End date";
                $('#modelDialogRestoreBckup').modal('show');
            }else if($("#startdatetime").val() > $("#enddatetime").val()){
                this.modelTitle = "Error";
                this.message = "Start date should not be greater than End date";
                $('#modelDialogRestoreBckup').modal('show');
            }else{
                startDateTime = $("#startdatetime").val();
                endDateTime = $("#enddatetime").val();
                // console.log(startDateTime);
                // console.log(endDateTime);
                startDateTime = new Date(view.calculateDateTime(startDateTime)).getTime();
                endDateTime = new Date(view.calculateDateTime(endDateTime)).getTime();
                console.log(startDateTime);
                console.log(endDateTime);
                view.getBackupTableData(startDateTime,endDateTime);
            }   
        }   
    }

    getBackupTableData(startDateTime,endDateTime){
        let clusterIp = this.clusterIP;
        const queryObj = {
            ip: clusterIp,
            startdatetime: startDateTime,
            enddatetime: endDateTime
        }; 
        const componentFactory = this.componentFactoryResolver.resolveComponentFactory(BackupTableComponent);
        this.backupTable.clear();
        const dyynamicComponent: any = <BackupTableComponent>this.backupTable.createComponent(componentFactory).instance;
        dyynamicComponent.queryString = queryObj;
    }
    calculateDateTime(datetime){
        let dt: any = '';
        let t: any = '';
        datetime = datetime.replace(/\//g,"-");
        console.log(datetime);
        dt = datetime.split(" ");
        t = dt[1].split(":");
        if(t[0].length == 1 ){
            if(datetime.includes('AM')){
                t[0] = "0" + t[0];
            }else{
                if(parseInt(t[0]) < 12){
                    t[0] = parseInt(t[0]) + 12;    
                }
            }
        } else{
            if(datetime.includes('PM') && parseInt(t[0]) < 12){             
                t[0] = parseInt(t[0]) + 12;    
            }
        }
        let d = dt[0].split('-');
        datetime = d[2] + '-' +d[0] + '-' +d[1] + "T" + t[0] + ":" + t[1];
        
        return datetime.replace(/\s+(AM|PM)/,"");
    }

    getStartDateTime(startTime) {
        let dt = startTime.slice(0,16);
        console.log('dtdt');
        console.log(dt);
        let t = dt.split('T');
        console.log(t);
        let hour = t[1].split(':');
        let isAMorPM = 'AM';
        if (hour[0] > 12) {
            isAMorPM = 'PM';
            hour[0] -= 12;
        }
        console.log(hour);
        // 2018-04-26T06:50
        let date = t[0].split('-');
        dt = dt.replace(/T/," ");
        dt = dt.replace(/-/,"\/");
        const startDate = date[1] + '/' + date[2] + '/' + date[0]+ " " + hour[0] + ":" + hour[1] + " " + isAMorPM;
        return startDate;
    }

    getCurrentDateTime(checkTime,timeframe){
        let currentdate = new Date();
        let timeStamp;
        console.log(currentdate);
        console.log(timeframe);
        console.log(checkTime);
        let month: any = currentdate.getMonth()+1;
        let day: any = currentdate.getDate();
        let hour: any = currentdate.getHours();
        let minutes: any = currentdate.getMinutes();
        let seconds: any = currentdate.getSeconds();
        let datetime: any = {};
        if(checkTime){
            switch(timeframe){
                case '24Hours':
                // day -= 1;
                timeStamp= (Math.round(currentdate.getTime())-(24*60*60*1000));
                console.log(new Date(timeStamp));
                break;
                case 'lastWeek':
                // day -= 7;
                timeStamp= (Math.round(currentdate.getTime())-(7*24*60*60*1000));
                console.log(timeStamp);
                break;
                case 'lastMonth':
                // month -= 1;
                if((month==1) || (month==2) || (month==4) || (month==6) || (month==8) || (month==9) || (month==11)) {                    
                    timeStamp= new Date(Math.round(currentdate.getTime())-(31*24*60*60));
                } else if((month==3)) {
                    if((currentdate.getFullYear()%4) == 0) {
                        timeStamp= new Date(Math.round(currentdate.getTime())-(29*24*60*60));
                    } else {
                        timeStamp= new Date(Math.round(currentdate.getTime())-(28*24*60*60));
                    }
                } else if((month==5) || (month==7) || (month==10) || (month==12)) {
                    timeStamp= new Date(Math.round(currentdate.getTime())-(30*24*60*60));
                }
                console.log(timeStamp);
                break;
                case 'custom':
                console.log(timeStamp);
                break;
                default:
                // day -= 1;
                timeStamp= (Math.round(currentdate.getTime())-(24*60*60));
                console.log(timeStamp);
                break;
            }
        }
        if (month < 10) 
            month = "0" + month;
        if (day < 10){

            day = "0" + day;
        } 
        if (minutes < 10) 
            minutes = "0" + minutes;
        // if (seconds < 10) 
        //     seconds = "0" + seconds;
        let isAMorPM = 'AM';
        if (hour > 12) {
            isAMorPM = 'PM'
        }
        if (hour < 10) 
            hour = "0" + hour;
        const d1 = currentdate.getFullYear() + "-" + month  + "-" + day + "T" + hour + ":" + minutes;
        const d2 = month + "/" + day  + "/" + currentdate.getFullYear() + " " + ((hour > 12) ? (hour-12) : hour) + ":" + minutes + " " + isAMorPM;  
        if(!checkTime){
            datetime = {
                //datetimeSend: currentdate.getFullYear() + "-" + currentdate.getMonth() + '-' + currentdate.getDate() + 'T' + currentdate.getHours() + ':' + currentdate.getMinutes() /*(Math.round(currentdate.getTime())).toString()*/,
                datetimeSend : Math.round(currentdate.getTime()),
                datetimeSet: d2
            };
        } else {
            datetime = {
                //datetimeSend: timeStamp.getFullYear() + '-' + timeStamp.getMonth() + '-' + timeStamp.getDate() + 'T' + timeStamp.getHours() + ':' + timeStamp.getMinutes() /*.toString()*/,
                datetimeSend : timeStamp,
                datetimeSet: d2
            };
        }
        console.log(datetime);
        return datetime; 
    }

    configDiff(tab){
        let view = this;
        if(view.selectedFiles.length > 1){
            this.modelTitle = 'Config Diff';
            this.message = 'Please select only one file for config diff';
            $('#modelDialogBckupSettings').modal('show');
        }else if (view.selectedFiles.length == 1) {
            //$('.nav-tabs a[href="#' + tab + '"]').tab('show');
            //alert("selected time frame")
            view.selectedTimeFrame(false,'custom');
        }else if (view.selectedFiles.length == 0) {
            $('.nav-tabs a[href="#' + tab + '"]').tab('show');
            view.selectedTimeFrame(true,'notcustom');
        }   
    }

    deleteConfigFile(){
        let view = this;

        if (view.selectedFiles.length == 1) {
            let configId = view.backupFileId; //backupFileId
            $('#configDownloadOverlay').show();
            this.apiData.deleteConfigBackupFile(configId).subscribe(res => {
                $('#configDownloadOverlay').hide();
                if (!res.success) {
                    this.modelTitle = 'Error';
                    this.message = res.message;
                    $('#modelDialogRestoreBckup').modal('show');
                }
                else{
                    this.modelTitle = 'Success';
                    this.message = res.message;
                    $('#deleteConfigFileConfirm').modal('hide');
                    $('#modelDialogRestoreBckup').modal('show');
                }
                view.selectedFiles = [];
                view.refreshConfigTableList();
            }, function(err) {
                view.loaderDisplayRestore = 'none';
                view.errorResponse = err;
                    $('.modal-backdrop').hide();
                $('#clusterDetailOverlay').hide();
                if (view.errorResponse.message.includes('Session')) {
                    view.sharedService.logout(true);
                } else {
                    view.showAlert(view.errorResponse.title, view.errorResponse.message);
                }
            });
        } else if ((view.selectedFiles.length == 0) || view.selectedFiles.length > 1) {
            view.wrongNoofUserSelected = true;
            this.modelTitle = 'Delete Config Backup File';
            this.message = 'Please select one file to delete';
            $('#modelDialogBckupSettings').modal('show');
        }
    }

    showAlert(title: string, msg: string) {
        this.clusterDetailTitle = title;
        this.clusterDetailMessage = msg;

        $('#openClusterDetailpopup').click();
    }

    okClusterDetailBtnClicked() {
        $("#confirmClusterDetailModal close").click();
    }
    cancelSyncCluster() {
        $('#clusterSyncModal').modal('hide');
    }
    onOk() {
        $('#modelDialogBckupSettings').modal('hide');
    }
    okBtnClicked() {
        $('#modelDialogRestoreBckup').modal('hide');
        $('#modelDialogRestoreBckupConfirm').modal('hide');
    }
    cancel(){
        $('#deleteConfigFileConfirm').modal('hide');
    }
}