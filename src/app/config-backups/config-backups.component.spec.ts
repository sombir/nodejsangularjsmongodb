import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigBackupsComponent } from './config-backups.component';

describe('ConfigBackupsComponent', () => {
  let component: ConfigBackupsComponent;
  let fixture: ComponentFixture<ConfigBackupsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigBackupsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigBackupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
