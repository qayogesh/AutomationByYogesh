package com.yogesh.automation.practicePrograms;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class Internationalization {

	public static void main(String[] args) {

		DateFormat dateFormat = DateFormat.getDateInstance(DateFormat.DEFAULT);
		Date date = new Date();
		String localeDate = dateFormat.format(date);
		System.out.println(Locale.US);
		System.out.println(Locale.CHINA);
		System.out.println(Locale.getISOCountries().toString());
	}
}
