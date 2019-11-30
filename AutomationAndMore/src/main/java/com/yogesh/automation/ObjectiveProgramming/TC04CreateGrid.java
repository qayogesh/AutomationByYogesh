package com.yogesh.automation.ObjectiveProgramming;

public class TC04CreateGrid {

	public static void main(String[] args) {
		// TODO Auto-generated method stub

		Integer[][] dd = new Integer[10][10];
		for(int i=1; i<10; i++) {
			
			for(int j=1; j<10; j++) {
				System.out.printf("%2d ", dd[i][j]);
			}
			System.out.println();
			
		}
		
		
	}


}
