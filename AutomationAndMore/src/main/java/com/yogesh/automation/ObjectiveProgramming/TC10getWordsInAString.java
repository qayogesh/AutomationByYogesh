package com.yogesh.automation.ObjectiveProgramming;

public class TC10getWordsInAString {

	public static void main(String[] args) {
		TC10getWordsInAString obj = new TC10getWordsInAString();
		System.out.print(obj.getWords(" this is to check the number of words are 10"));
	}

	public int getWords(String str) {
		return str.trim().split(" ").length; 
	}
	
}
