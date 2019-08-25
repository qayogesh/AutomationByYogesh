package com.yogesh.automation.practicePrograms;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TC14_Regex_EmailList_Validations {

	public static void main(String[] args) {

		// test data
		List<String> emailLists = Arrays.asList("yogesh@yogesh.net", "sagar@sagar.com", "harshada@harshada.net",
				"Viv@viv.com", "sagar@sagar.com");

		Pattern pattern = Pattern.compile("^(.+)net$");

		for (String email : emailLists) {
			Matcher m = pattern.matcher(email);
			if (m.matches()) {
				System.out.println(email);
			}
		}
	}
}
