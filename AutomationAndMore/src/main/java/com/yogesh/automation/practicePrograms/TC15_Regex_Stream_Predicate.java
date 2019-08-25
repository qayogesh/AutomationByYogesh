package com.yogesh.automation.practicePrograms;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.google.common.base.Predicate;

public class TC15_Regex_Stream_Predicate {

	public static void main(String[] args) {
		List<String> emailLists = Arrays.asList("yogesh@yogesh.net", "sagar@sagar.com", "harshada@harshada.net",
				"Viv@viv.com", "sagar@sagar.com");

		java.util.function.Predicate<String> pattern = Pattern.compile("^(.+)com$").asPredicate();

		List<String> desiredEmails = emailLists.stream().filter(pattern).collect(Collectors.toList());

		desiredEmails.forEach(System.out::println);
	}
}
