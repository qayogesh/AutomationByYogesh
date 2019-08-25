package com.yogesh.automation.practicePrograms;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TC13_Regex_Pattern_Matcher {

	public static void main(String[] args) {

		String toOperate = "this is string, it contains log details for java program debugging and much more. also it contains lots of useful information to learn, you can learn java program and Thanks for reading this, again Thanks";

		Matcher m = Pattern.compile("it").matcher(toOperate);
		int count = 0;
		while (m.find()) {
			System.out.println("Group- matched subsequence =>" + m.group());

			System.out.println("Starting index of matched subsequence =>" + m.start());

			System.out.println("End index of matched subsequence =>" + m.end());

			System.out.println("Group count- Total number of matched subsequence =>" + m.groupCount());

			count++;
		}
		System.out.println("Thanks occurance is =>" + count + " times");
	}

}
