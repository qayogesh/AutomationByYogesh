package com.yogesh.automation.ObjectiveProgramming;

public class TC16FibonacciSeries {

	public static void main(String[] args) {
		int sum, t1 = 0;
		int t2=1;
		for(int i= 0; i<100; i++) {
			sum = t1 + t2;
			t1 = t2;
			t2 = t2 +1;
			System.out.print(sum + ", ");
		}

	}
	
	

}
