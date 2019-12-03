package com.yogesh.automation.ObjectiveProgramming;

public class TC11LearYear {

	public static void main(String[] args) {
		TC11LearYear obj = new TC11LearYear();
		obj.isLeapYear(2017);
	}

	
	public void isLeapYear(int year) {
		if(year%100==0 || year%4 ==0 || year % 400==0 ) {
			System.out.println("True");
		}
	}
	
}
