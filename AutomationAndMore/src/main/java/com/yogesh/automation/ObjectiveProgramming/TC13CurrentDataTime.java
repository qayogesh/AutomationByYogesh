package com.yogesh.automation.ObjectiveProgramming;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class TC13CurrentDataTime {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		getCurrentDateAndtime();
	}
	
	public static void getCurrentDateAndtime() {
		Calendar cal = Calendar.getInstance(Locale.US);
		System.out.println(cal.getTime());
		System.out.println(cal.getTimeInMillis());
		System.out.println(cal.getFirstDayOfWeek());
		
		SimpleDateFormat sdf1 = new SimpleDateFormat("MM/dd/yyyy");
		SimpleDateFormat sdf2 = new SimpleDateFormat("MM/dd/yyyy aa");
		SimpleDateFormat sdf3 = new SimpleDateFormat("dd-MM-yyyy");
		SimpleDateFormat sdf4 = new SimpleDateFormat("MM/dd/yyyy:hh:mm:ss");
		SimpleDateFormat getDate = new SimpleDateFormat("dd");

		System.out.println(sdf1.format(new Date()));
		System.out.println(sdf2.format(new Date()));
		System.out.println(sdf3.format(new Date()));
		System.out.println(sdf4.format(new Date()));

		System.out.println(getDate.format(new Date()));
		
		//remove leading zero, if date is 03 then it will display as 3
		System.out.println(getDate.format(new Date()).replaceAll("^0+(?=.)", ""));
		
	}

}
